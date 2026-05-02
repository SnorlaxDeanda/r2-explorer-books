import { R2Explorer } from "r2-explorer";

const basicAuthUsers = [
	{
		username: "Joe",
		password: "12datass",
	},
	{
		username: "booktok",
		password: "booktok",
	},
];

const explorer = R2Explorer({
	// Set to false to allow users to upload files
	readonly: true,
	basicAuth: basicAuthUsers,

	// Learn more how to secure your R2 Explorer instance:
	// https://r2explorer.com/getting-started/security/
	// cfAccessTeamName: "my-team-name",
});

export default {
	...explorer,
	async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
		const downloadResponse = await handleDirectDownload(request, env);

		if (downloadResponse) {
			return downloadResponse;
		}

		const response = await explorer.fetch(
			withoutDownloadQuery(request),
			env as unknown as Parameters<typeof explorer.fetch>[1],
			context,
		);

		return withMobileDownloadHeaders(request, response);
	},
};

async function handleDirectDownload(
	request: Request,
	env: Env,
): Promise<Response | undefined> {
	if (request.method !== "GET" && request.method !== "HEAD") {
		return undefined;
	}

	const url = new URL(request.url);
	const downloadRequest = parseDirectDownloadPath(url.pathname);

	if (!downloadRequest) {
		return undefined;
	}

	if (!isAuthorized(request)) {
		return new Response("Authentication error: Basic Auth required", {
			status: 401,
			headers: {
				"WWW-Authenticate": 'Basic realm="Secure Area"',
			},
		});
	}

	const bucket = (env as unknown as Record<string, R2Bucket | undefined>)[
		downloadRequest.bucket
	];

	if (!bucket) {
		return Response.json(
			{ msg: `Bucket binding not found: ${downloadRequest.bucket}` },
			{ status: 500 },
		);
	}

	if (request.method === "HEAD") {
		const object = await bucket.head(downloadRequest.key);

		if (object === null) {
			return Response.json({ msg: "Object Not Found" }, { status: 404 });
		}

		const headers = buildObjectDownloadHeaders(object, downloadRequest.fileName);

		return new Response(null, { headers });
	}

	const object = await bucket.get(downloadRequest.key);

	if (object === null) {
		return Response.json({ msg: "Object Not Found" }, { status: 404 });
	}

	return new Response(object.body, {
		headers: buildObjectDownloadHeaders(object, downloadRequest.fileName),
	});
}

function withoutDownloadQuery(request: Request): Request {
	const url = new URL(request.url);

	if (url.searchParams.get("download") !== "true") {
		return request;
	}

	const downloadRequest = parseBucketObjectDownloadPath(url.pathname);

	if (downloadRequest) {
		url.pathname = `/api/buckets/${downloadRequest.bucket}/${downloadRequest.encodedKey}`;
	}

	url.searchParams.delete("download");

	return new Request(url, request);
}

function withMobileDownloadHeaders(request: Request, response: Response): Response {
	const url = new URL(request.url);

	if (
		request.method !== "GET" ||
		url.searchParams.get("download") !== "true" ||
		response.status !== 200
	) {
		return response;
	}

	const fileName = parseBucketObjectDownloadPath(url.pathname)?.fileName;

	if (!fileName) {
		return response;
	}

	const headers = new Headers(response.headers);
	applyDownloadHeaders(headers, fileName);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function parseDirectDownloadPath(
	pathname: string,
): { bucket: string; key: string; fileName: string } | undefined {
	const match = pathname.match(/^\/api\/download\/([^/]+)\/([^/]+)\/([^/]+)$/);

	if (!match) {
		return undefined;
	}

	const [, bucket, encodedKey, encodedFileName] = match;
	const key = decodeR2ExplorerKey(encodedKey);
	const fileName = safeDecodeURIComponent(encodedFileName);

	return { bucket, key, fileName: fileName || "download" };
}

function parseBucketObjectDownloadPath(
	pathname: string,
): { bucket: string; encodedKey: string; fileName: string } | undefined {
	const match = pathname.match(/^\/api\/buckets\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);

	if (!match) {
		return undefined;
	}

	const [, bucket, encodedKey, encodedFileName] = match;
	const key = decodeR2ExplorerKey(encodedKey);
	const fileName = encodedFileName
		? safeDecodeURIComponent(encodedFileName)
		: key.split("/").filter(Boolean).pop();

	return { bucket, encodedKey, fileName: fileName || "download" };
}

function decodeR2ExplorerKey(key: string): string {
	const decodedKey = safeDecodeURIComponent(key);

	try {
		return decodeURIComponent(escape(atob(decodedKey)));
	} catch {
		return decodedKey;
	}
}

function safeDecodeURIComponent(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function isAuthorized(request: Request): boolean {
	const authorization = request.headers.get("Authorization");

	if (!authorization?.startsWith("Basic ")) {
		return false;
	}

	try {
		const [username, password] = atob(authorization.slice("Basic ".length)).split(
			":",
			2,
		);

		return basicAuthUsers.some(
			(user) => user.username === username && user.password === password,
		);
	} catch {
		return false;
	}
}

function applyDownloadHeaders(headers: Headers, fileName: string): void {
	headers.set("Content-Disposition", buildAttachmentHeader(fileName));
	headers.set("Content-Type", "application/octet-stream");
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("Cache-Control", "private, no-transform");
}

function buildObjectDownloadHeaders(object: R2Object, fileName: string): Headers {
	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("content-length", object.size.toString());
	applyDownloadHeaders(headers, fileName);

	return headers;
}

function buildAttachmentHeader(fileName: string): string {
	const asciiFileName = fileName
		.replace(/[^\x20-\x7E]/g, "_")
		.replace(/\\/g, "\\\\")
		.replace(/"/g, "\\\"");

	return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
