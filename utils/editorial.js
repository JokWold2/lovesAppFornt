import { get } from './request.js'
import { config } from './config.js'

function activityCoverUrl(cover) {
 if (typeof cover !== 'string') return ''
 const path = cover.trim()
 if (!/^\/?static\/activities\//.test(path)) return path
 return `${config.baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}
function withActivityCover(item) {
 return item ? { ...item, cover: activityCoverUrl(item.cover) } : item
}
function withActivityCovers(data) {
 return data && Array.isArray(data.items)
  ? { ...data, items: data.items.map(withActivityCover) }
  : data
}

export const getActivities = locale => get('/api/activities', { locale }, { noAuth: true, silent: true }).then(withActivityCovers)
export const getActivity = (id, locale) => get(`/api/activities/${encodeURIComponent(id)}`, { locale }, { noAuth: true, silent: true }).then(withActivityCover)
export const getActivityMoments = (id, page, mine) => get(`/api/activities/${encodeURIComponent(id)}/moments`, { page, mine: mine ? 1 : 0 }, { silent: true })
export const editorialMessages = {
 'zh-Hans': { title:'活动', intro:'分享生活，一起创造美好', all:'全部', upcoming:'即将开始', active:'进行中', ended:'已结束', loading:'正在加载…', error:'暂时无法加载', retry:'重试', empty:'暂时没有活动', back:'返回', about:'活动介绍', rules:'参与规则', works:'大家的作品', mine:'我的作品', noWorks:'暂时没有作品', more:'加载更多', join:'发布动态参与', publicHint:'参与作品将公开展示', linked:'正在参与活动', unavailable:'活动暂时不可参与，请返回详情查看', fallback:'当前语言尚未提供，显示：' },
 'zh-Hant': { title:'活動', intro:'分享生活，一起創造美好', all:'全部', upcoming:'即將開始', active:'進行中', ended:'已結束', loading:'正在載入…', error:'暫時無法載入', retry:'重試', empty:'暫時沒有活動', back:'返回', about:'活動介紹', rules:'參與規則', works:'大家的作品', mine:'我的作品', noWorks:'暫時沒有作品', more:'載入更多', join:'發佈動態參與', publicHint:'參與作品將公開展示', linked:'正在參與活動', unavailable:'活動暫時不可參與，請返回詳情查看', fallback:'目前語言尚未提供，顯示：' },
 en: { title:'Events', intro:'Share your days. Create something good together.', all:'All', upcoming:'Upcoming', active:'Ongoing', ended:'Ended', loading:'Loading…', error:'Unable to load', retry:'Try again', empty:'No events yet', back:'Back', about:'About this event', rules:'How to participate', works:'Community posts', mine:'My posts', noWorks:'No posts yet', more:'Load more', join:'Share a post to join', publicHint:'Your event post will be public', linked:'Joining an event', unavailable:'This event is unavailable. Return to its details.', fallback:'Not available in your language. Showing: ' },
 ru: { title:'События', intro:'Делитесь жизнью и создавайте прекрасное вместе', all:'Все', upcoming:'Скоро', active:'Идёт', ended:'Завершено', loading:'Загрузка…', error:'Не удалось загрузить', retry:'Повторить', empty:'Событий пока нет', back:'Назад', about:'О событии', rules:'Как участвовать', works:'Публикации участников', mine:'Мои публикации', noWorks:'Публикаций пока нет', more:'Загрузить ещё', join:'Участвовать: создать публикацию', publicHint:'Публикация будет видна всем', linked:'Участие в событии', unavailable:'Событие недоступно. Вернитесь к описанию.', fallback:'Перевода пока нет. Язык: ' },
 ja: { title:'イベント', intro:'日々を分かち合い、一緒に素敵な時間を', all:'すべて', upcoming:'開催予定', active:'開催中', ended:'終了', loading:'読み込み中…', error:'読み込めませんでした', retry:'再試行', empty:'イベントはまだありません', back:'戻る', about:'イベントについて', rules:'参加方法', works:'みんなの投稿', mine:'自分の投稿', noWorks:'投稿はまだありません', more:'もっと見る', join:'投稿して参加する', publicHint:'参加する投稿は公開されます', linked:'参加するイベント', unavailable:'現在参加できません。詳細に戻ってください。', fallback:'この言語の翻訳は未提供です。表示言語：' },
 ko: { title:'이벤트', intro:'일상을 나누고 함께 좋은 순간을 만들어요', all:'전체', upcoming:'예정', active:'진행 중', ended:'종료', loading:'불러오는 중…', error:'불러오지 못했어요', retry:'다시 시도', empty:'아직 이벤트가 없어요', back:'뒤로', about:'이벤트 소개', rules:'참여 방법', works:'참여 게시물', mine:'내 게시물', noWorks:'아직 게시물이 없어요', more:'더 보기', join:'게시물로 참여하기', publicHint:'참여 게시물은 공개돼요', linked:'참여하는 이벤트', unavailable:'현재 참여할 수 없어요. 상세 페이지로 돌아가 주세요.', fallback:'번역이 아직 없어요. 표시 언어: ' }
}
export const contentLanguageNames = { 'zh-Hans':'简体中文', 'zh-Hant':'繁體中文', en:'English', ru:'Русский', ja:'日本語', ko:'한국어' }
export function eventDates(item) {
 const format = value => { const d = new Date(value); const pad = n => String(n).padStart(2, '0'); return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` }
 return `${format(item.startsAt)} – ${format(item.endsAt)}`
}

const selectionCopy = {
 'zh-Hans':['参与活动','不参加活动','暂无进行中的活动','话题和正文合计最多 2000 字'],
 'zh-Hant':['參與活動','不參加活動','暫無進行中的活動','話題和正文合計最多 2000 字'],
 en:['Join an event','No event','No ongoing events','The topic and post can contain up to 2,000 characters'],
 ru:['Участвовать в событии','Без события','Нет текущих событий','Тема и текст: не более 2000 символов'],
 ja:['イベントに参加','参加しない','開催中のイベントはありません','話題と本文は合計2000文字以内です'],
 ko:['이벤트 참여','참여하지 않음','진행 중인 이벤트가 없어요','주제와 본문은 총 2,000자까지 가능해요']
}
Object.entries(selectionCopy).forEach(([locale,copy])=>Object.assign(editorialMessages[locale],{selectActivity:copy[0],noActivity:copy[1],noActive:copy[2],tooLong:copy[3]}))

export const getMyActivities = (locale, page=1) => get('/api/activities/mine', {locale,page}, {silent:true}).then(withActivityCovers)
const discoveryCopy = {
 'zh-Hans':['主推活动','我的参与','发现活动','热度','人参与','件作品','还没有参与活动','去发现一个喜欢的主题，发布动态加入吧','查看活动','活动已下架','查看我的作品','参与热度由公开参与人数、作品数与点赞数相加得出','登录后查看','探索活动'],
 'zh-Hant':['主推活動','我的參與','探索活動','熱度','人參與','件作品','還沒有參與活動','探索喜歡的主題，發佈動態加入吧','查看活動','活動已下架','查看我的作品','參與熱度為公開參與人數、作品數與按讚數之和','登入後查看','探索活動'],
 en:['Featured events','My events','Discover events','Heat','participants','posts','No events joined yet','Find a topic you love and join with a post','View event','Event unavailable','View my posts','Heat is the sum of public participants, posts and likes','Sign in to view','Explore events'],
 ru:['Рекомендуем','Мои события','Найти событие','Активность','участников','публикаций','Вы пока не участвовали','Выберите тему и присоединитесь с публикацией','О событии','Событие недоступно','Мои публикации','Активность — сумма участников, открытых публикаций и лайков','Войдите для просмотра','Найти события'],
 ja:['おすすめ','参加したイベント','イベントを探す','注目度','人が参加','件の投稿','まだ参加していません','好きなテーマを見つけて投稿してみましょう','詳細を見る','公開終了','自分の投稿を見る','注目度は公開参加者数・投稿数・いいね数の合計です','ログインして見る','イベントを探す'],
 ko:['추천 이벤트','내 참여','이벤트 둘러보기','관심도','명 참여','개 게시물','아직 참여한 이벤트가 없어요','마음에 드는 주제를 골라 게시물로 참여하세요','이벤트 보기','공개 종료','내 게시물 보기','관심도는 공개 참여자 수, 게시물 수, 좋아요 수의 합계예요','로그인 후 보기','이벤트 둘러보기']
}
Object.entries(discoveryCopy).forEach(([locale,a])=>Object.assign(editorialMessages[locale],Object.fromEntries(['featured','myEvents','discover','heat','participants','postCount','noJoined','joinHint','viewEvent','offline','viewMyPosts','heatHint','signIn','explore'].map((key,i)=>[key,a[i]]))))
