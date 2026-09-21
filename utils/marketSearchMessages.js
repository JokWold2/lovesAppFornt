const keys = ['antique','secondHand','filter','range','min','max','sort','latest','price_asc','price_desc','reset','confirm','invalid','empty','failed','more']
const translations = {
  'zh-Hans': ['搜索古董','搜索二手市场','筛选','价格区间','最低价','最高价','排序方式','最新发布','价格从低到高','价格从高到低','重置','确定','请输入有效的价格区间','没有找到相关商品，试试其他关键词或价格','加载失败，点击重试','加载更多'],
  'zh-Hant': ['搜尋古董','搜尋二手市場','篩選','價格區間','最低價','最高價','排序方式','最新發布','價格從低到高','價格從高到低','重置','確定','請輸入有效的價格區間','沒有找到相關商品，試試其他關鍵詞或價格','載入失敗，點擊重試','載入更多'],
  en: ['Search antiques','Search second-hand items','Filters','Price range','Min price','Max price','Sort by','Newest','Price: low to high','Price: high to low','Reset','Apply','Enter a valid price range','No matching items. Try another keyword or price range.','Could not load. Tap to retry.','Load more'],
  ru: ['Поиск антиквариата','Поиск подержанных вещей','Фильтры','Диапазон цен','От','До','Сортировка','Сначала новые','Сначала дешевле','Сначала дороже','Сбросить','Применить','Укажите корректный диапазон цен','Товары не найдены. Измените запрос или диапазон цен.','Ошибка загрузки. Нажмите для повтора.','Загрузить ещё'],
  ja: ['アンティークを検索','中古品を検索','絞り込み','価格帯','最低価格','最高価格','並び順','新着順','価格が安い順','価格が高い順','リセット','適用','有効な価格帯を入力してください','商品が見つかりません。キーワードや価格帯を変更してください。','読み込めませんでした。タップして再試行。','もっと見る'],
  ko: ['골동품 검색','중고 상품 검색','필터','가격 범위','최저 가격','최고 가격','정렬','최신순','낮은 가격순','높은 가격순','초기화','적용','올바른 가격 범위를 입력해 주세요','상품이 없습니다. 검색어나 가격 범위를 변경해 주세요.','불러오지 못했습니다. 눌러서 다시 시도하세요.','더 보기']
}
export const marketSearchMessages = Object.fromEntries(Object.entries(translations).map(([locale, values]) => [locale, Object.fromEntries(keys.map((key, index) => [key, values[index]]))]))
