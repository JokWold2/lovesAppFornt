/** Adds server-loaded replies to a floor while preserving the preview order. */
export function appendReplies(floor, replies) {
	const replyMap = new Map((floor.replies || []).map((reply) => [String(reply.id), reply]));
	;(replies || []).forEach((reply) => replyMap.set(String(reply.id), reply));
	return {
		...floor,
		replies: Array.from(replyMap.values()),
		repliesExpanded: true,
	};
}

/** Formats API timestamps for the compact time label used in comment rows. */
export function formatCommentTime(value, now = new Date()) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
	if (seconds < 60) return '刚刚';
	if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
	if (seconds < 172800) return '昨天';
	return `${date.getMonth() + 1}月${date.getDate()}日`;
}
