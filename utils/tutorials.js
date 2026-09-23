import { get } from './request.js'

export const getTutorials = locale => get('/api/tutorials', { locale }, { noAuth: true, silent: true })
export const getTutorial = (id, locale) => get(`/api/tutorials/${encodeURIComponent(id)}`, { locale }, { noAuth: true, silent: true })

// Session-only navigation intent: returning from a tutorial must not reload feeds.
let pendingHomeTarget = null
export function queueTutorialHomeTarget(target) { pendingHomeTarget = target }
export function consumeTutorialHomeTarget() {
  const target = pendingHomeTarget
  pendingHomeTarget = null
  return target
}

export const tutorialMessages = {
  'zh-Hans': { title: '教学指南', hero: '从这里，开始美好相遇', intro: '认识 BLESS，轻松迈出第一步', all: '全部', start: '新手指南', social: '交流技巧', trade: '安心交易', loading: '正在加载教程…', error: '教程暂时未能加载', retry: '重新加载', empty: '暂时没有教程', back: '返回', steps: '屏引导', page: '第', unavailable: '暂时无法打开，请重试' },
  'zh-Hant': { title: '教學指南', hero: '從這裡，開始美好相遇', intro: '認識 BLESS，輕鬆邁出第一步', all: '全部', start: '新手指南', social: '交流技巧', trade: '安心交易', loading: '正在載入教學…', error: '暫時無法載入教學', retry: '重新載入', empty: '暫時沒有教學', back: '返回', steps: '頁引導', page: '第', unavailable: '暫時無法開啟，請重試' },
  en: { title: 'Guides', hero: 'Good connections start here', intro: 'Get to know BLESS, one step at a time', all: 'All', start: 'Getting started', social: 'Conversation', trade: 'Trading', loading: 'Loading guides…', error: 'Unable to load this guide', retry: 'Try again', empty: 'No guides yet', back: 'Back', steps: 'steps', page: 'Step', unavailable: 'Unable to open. Please try again' },
  ru: { title: 'Руководства', hero: 'Знакомство начинается здесь', intro: 'Узнайте BLESS шаг за шагом', all: 'Все', start: 'Первые шаги', social: 'Общение', trade: 'Сделки', loading: 'Загрузка руководств…', error: 'Не удалось загрузить руководство', retry: 'Повторить', empty: 'Руководств пока нет', back: 'Назад', steps: 'шага', page: 'Шаг', unavailable: 'Не удалось открыть. Повторите попытку' },
  ja: { title: '使い方ガイド', hero: 'ここから、素敵な出会いを', intro: 'BLESSを知って、最初の一歩を', all: 'すべて', start: 'はじめに', social: '会話のヒント', trade: '取引ガイド', loading: 'ガイドを読み込み中…', error: 'ガイドを読み込めませんでした', retry: '再読み込み', empty: 'ガイドはまだありません', back: '戻る', steps: 'ステップ', page: 'ステップ', unavailable: '開けませんでした。もう一度お試しください' },
  ko: { title: '이용 가이드', hero: '좋은 만남의 시작', intro: 'BLESS를 하나씩 알아보세요', all: '전체', start: '시작하기', social: '대화 팁', trade: '거래 안내', loading: '가이드 불러오는 중…', error: '가이드를 불러오지 못했어요', retry: '다시 시도', empty: '아직 가이드가 없어요', back: '뒤로', steps: '단계', page: '단계', unavailable: '열 수 없어요. 다시 시도해 주세요' }
}
