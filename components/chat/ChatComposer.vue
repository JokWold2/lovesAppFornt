<template>
	<view
		class="composer-wrap"
		:style="{ marginBottom: `${keyboardHeight}px` }"
	>
		<view v-if="replyMessage" class="replying"
			><text>{{ t('chat.replyTo', { name: replyPreview.author, text: replyPreview.text }) }}</text
			><text class="close-reply" role="button" :aria-label="t('chatDesign.close')" @tap="$emit('close-reply')"
				>×</text
			></view
		>
		<view class="composer">
      <button class="photo-tool" :disabled="disabled" :aria-label="t('chatDesign.photo')" @tap="chooseImage"><image class="tool-icon" src="/static/img/icon-create-post-dark.png" mode="aspectFit" /></button>
      <view class="input-pill">
			<textarea
				v-model="draft"
				class="draft"
				auto-height
				:adjust-position="false"
				:show-confirm-bar="false"
				:cursor-spacing="20"
				maxlength="2000"
				confirm-type="send"
				:placeholder="t('chat.sendMessage')"
				@focus="$emit('focus')"
				@input="onInput"
				@confirm="send"
				@keyboardheightchange="
					$emit('keyboard-height', $event.detail.height || 0)
				"
				@blur="$emit('keyboard-height', 0)"
			/>
      <button class="emoji-tool" :aria-label="t('chatDesign.emoji')" @tap="emojiPanelVisible = !emojiPanelVisible"><image class="tool-icon" src="/static/img/icon-emoji-dark.png" mode="aspectFit" /></button>
      <button v-if="draft.trim()" class="send-tool" :disabled="disabled" :aria-label="t('chat.sendMessage')" @tap="send"><view class="send-disc"><view class="send-arrow" /></view></button>
      </view>
    </view>
		<view v-if="mentionPanelVisible" class="member-panel"
			><view
				v-for="member in filteredMembers"
				:key="member.userId"
				class="member-option"
				@tap="chooseMention(member)"
				><image
					v-if="member.avatarUrl"
					:src="member.avatarUrl"
					class="member-avatar"
				/><view v-else class="member-avatar member-fallback">{{
					member.name?.slice(0, 1)
				}}</view
				><text>{{ member.name }}</text></view
			></view
		>
		<view v-if="emojiPanelVisible" class="emoji-panel"
			><text
				v-for="emoji in emojis"
				:key="emoji"
				class="emoji"
				@tap="draft = appendEmoji(draft, emoji)"
				>{{ emoji }}</text
			></view
		>
	</view>
</template>

<script setup>
import { computed, ref } from "vue";
import {
	appendEmoji,
	insertMention,
	makeTextMessagePayload,
} from "@/utils/chatComposerState.js";
import { formatReplyPreview } from "@/utils/chatMessagePresentation.js";
import { t } from '@/utils/localeRuntime.js';

const props = defineProps({
	members: { type: Array, default: () => [] },
	replyMessage: { type: Object, default: null },
	disabled: Boolean,
	keyboardHeight: { type: Number, default: 0 },
});
const emit = defineEmits([
	"send",
	"select-image",
	"close-reply",
	"keyboard-height",
	"focus",
]);
const draft = ref("");
const mentions = ref([]);
const emojiPanelVisible = ref(false);
const mentionPanelVisible = ref(false);
const emojis = ["😊", "😂", "🥰", "👍", "🙏", "❤️", "🎉", "😢", "😄", "👏"];
const replyPreview = computed(() => formatReplyPreview(props.replyMessage));
const mentionQuery = computed(() =>
	(draft.value.match(/@([^\s@]*)$/)?.[1] || "").toLowerCase(),
);
const filteredMembers = computed(() =>
	props.members.filter(
		(item) =>
			!mentionQuery.value ||
			String(item.name || "")
				.toLowerCase()
				.includes(mentionQuery.value),
	),
);
function onInput() {
	mentionPanelVisible.value = /@[^\s@]*$/.test(draft.value);
}
function chooseMention(member) {
	const next = insertMention(draft.value, mentions.value, member);
	draft.value = next.draft;
	mentions.value = next.mentions;
	mentionPanelVisible.value = false;
}
function send() {
	const payload = makeTextMessagePayload(
		draft.value,
		mentions.value,
		props.replyMessage,
	);
	if (!payload.content || props.disabled) return;
	emit("send", payload);
	draft.value = "";
	mentions.value = [];
	emojiPanelVisible.value = false;
}
function chooseImage() {
	if (props.disabled) return;
	uni.chooseImage({
		count: 1,
		sizeType: ["compressed"],
		sourceType: ["album", "camera"],
		success: (result) =>
			emit("select-image", { imagePath: result.tempFilePaths[0] }),
	});
}
</script>

<style scoped>
.composer-wrap {
	flex: none;
	padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
	background: #eeedeb;
	box-sizing: border-box;
}
.composer{display:flex;align-items:flex-end;gap:9px;min-height:46px;}
.input-pill{display:flex;flex:1;min-width:0;align-items:center;gap:0;padding:3px 4px 3px 16px;min-height:48px;border:1px solid #e2dfd9;border-radius:26px;background:#fff;box-sizing:border-box;}
.photo-tool,.emoji-tool,.send-tool{display:flex;align-items:center;justify-content:center;flex:0 0 44px;width:44px;height:44px;margin:0;padding:0;border-radius:50%;background:#fff;line-height:1;}.photo-tool::after,.emoji-tool::after,.send-tool::after{border:0;}.emoji-tool,.send-tool{height:40px;background:transparent;}.tool-icon{width:36px;height:36px;}.send-disc{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#efc635;transition:transform 120ms ease-out;}.send-tool:active .send-disc{transform:scale(.94);}.send-tool[disabled] .send-disc{opacity:.5;}.send-arrow{position:relative;width:16px;height:18px;color:#fff;}.send-arrow::before{content:"";position:absolute;top:3px;left:7px;width:2.5px;height:13px;background:currentColor;border-radius:2px;}.send-arrow::after{content:"";position:absolute;top:3px;left:3.5px;width:8px;height:8px;border-left:2.5px solid currentColor;border-top:2.5px solid currentColor;border-radius:1px;transform:rotate(45deg);}
@media(prefers-reduced-motion:reduce){.send-disc{transition:none;}}
.draft {
	flex: 1;
	min-width: 0;
	min-height: 26px;
	max-height: 160rpx;
	padding: 0;
	color: #292825;
	font-size: 16px;
	line-height: 26px;
}
.replying {
	display: flex;
	justify-content: space-between;
	gap: 16rpx;
	padding: 14rpx 18rpx;
	border-radius: 16px;margin-bottom:8px;
	color: #606772;
	background: #fff;
	font-size: 24rpx;
}
.close-reply {
	flex: none;
	font-size: 26px;
	line-height: 28px;
	min-width:44px;text-align:center;
}
.emoji-panel {
	display: flex;
	flex-wrap: wrap;
	gap: 20rpx;
	margin-top: 12rpx;
	padding: 24rpx;
	border-radius: 18rpx;
	background: #fff;
}
.emoji {
	font-size: 42rpx;
}
.member-panel {
	max-height: 340rpx;
	margin-top: 12rpx;
	overflow-y: auto;
	border-radius: 18rpx;
	background: #fff;
}
.member-option {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 16rpx 20rpx;
	color: #292825;
}
.member-avatar {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
}
.member-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	background: #bbb;
}
</style>
