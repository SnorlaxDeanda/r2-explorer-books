import { R2Explorer } from "r2-explorer";

const explorer = R2Explorer({
	// Set to false to allow users to upload files
	readonly: true,
	basicAuth: [
		{
			username: "Joe",
			password: "12datass",
		},
		{
			username: "booktok",
			password: "booktok",
		},
	],

	// Learn more how to secure your R2 Explorer instance:
	// https://r2explorer.com/getting-started/security/
	// cfAccessTeamName: "my-team-name",
});

export default {
	...explorer,
	async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
		const response = await explorer.fetch(request, env, context);

		return withMobileDownloadHeaders(request, response);
	},
};

function withMobileDownloadHeaders(request: Request, response: Response): Response {
	const url = new URL(request.url);

	if (
		request.method !== "GET" ||
		url.searchParams.get("download") !== "true" ||
		response.status !== 200
	) {
		return response;
	}

	const fileName = getBucketObjectFileName(url.pathname);

	if (!fileName) {
		return response;
	}

	const headers = new Headers(response.headers);
	headers.set("Content-Disposition", buildAttachmentHeader(fileName));
	headers.set("Content-Type", "application/octet-stream");
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("Cache-Control", "private, no-transform");

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function getBucketObjectFileName(pathname: string): string | undefined {
	const match = pathname.match(/^\/api\/buckets\/[^/]+\/([^/]+)$/);

	if (!match) {
		return undefined;
	}

	const key = decodeR2ExplorerKey(match[1]);
	const fileName = key.split("/").filter(Boolean).pop();

	return fileName || "download";
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

function buildAttachmentHeader(fileName: string): string {
	const asciiFileName = fileName
		.replace(/[^\x20-\x7E]/g, "_")
		.replace(/\\/g, "\\\\")
		.replace(/"/g, "\\\"");

	return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
