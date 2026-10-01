const keys = [
  'badge', 'banner', 'antiqueLockedTitle', 'secondHandLockedTitle',
  'priceLocked', 'cardHint', 'upgrade', 'detailAntiqueTitle',
  'detailSecondHandTitle', 'detailDescription', 'imageBenefit',
  'tradeBenefit', 'detailUpgrade', 'higherTiers', 'tradeLockedTitle'
]

const translations = {
  'zh-Hans': [
    '铜会员可见', '铜会员起可查看完整商品并参与交易', '古董藏品待解锁', '二手好物待解锁',
    '价格开通后可见', '图片与商品详情开通后可见', '开通铜会员', '这件藏品，开通后看清',
    '这件好物，开通后看清', '开通铜会员后查看完整图片、价格和商品介绍，并参与竞拍与交易。',
    '高清图片与真实商品信息', '详情交流与交易操作', '开通铜会员，查看完整内容', '银会员、金会员同样享有此权益', '开通铜会员，参与市场交易'
  ],
  'zh-Hant': [
    '銅會員可見', '銅會員起可查看完整商品並參與交易', '古董藏品待解鎖', '二手好物待解鎖',
    '價格開通後可見', '圖片與商品詳情開通後可見', '開通銅會員', '這件藏品，開通後看清',
    '這件好物，開通後看清', '開通銅會員後查看完整圖片、價格和商品介紹，並參與競拍與交易。',
    '高清圖片與真實商品資訊', '詳情交流與交易操作', '開通銅會員，查看完整內容', '銀會員、金會員同樣享有此權益', '開通銅會員，參與市場交易'
  ],
  en: [
    'Bronze members', 'Bronze membership unlocks full listings and trading', 'Unlock this antique', 'Unlock this second-hand find',
    'Price shown after upgrade', 'Upgrade to see photos and details', 'Get Bronze membership', 'See this antique clearly',
    'See this find clearly', 'Get Bronze membership to see full photos, prices and details, and take part in bidding and trading.',
    'Full photos and item information', 'Item details and trading', 'Get Bronze to view the full listing', 'Silver and Gold members also have access', 'Get Bronze to trade in the market'
  ],
  ru: [
    'Для бронзовых участников', 'Полные объявления и сделки доступны с бронзового уровня', 'Откройте этот антикварный товар', 'Откройте этот товар',
    'Цена после повышения уровня', 'Фото и описание после повышения уровня', 'Оформить бронзовый уровень', 'Рассмотрите этот антикварный товар',
    'Рассмотрите этот товар', 'Бронзовый уровень открывает полные фото, цены и описание, а также участие в торгах и сделках.',
    'Полные фото и сведения о товаре', 'Описание и сделки', 'Оформить бронзовый уровень', 'Серебряный и золотой уровни также дают доступ', 'Оформите бронзовый уровень для сделок'
  ],
  ja: [
    'ブロンズ会員限定', 'ブロンズ会員から商品情報の閲覧と取引ができます', 'この骨董品をチェック', 'この中古品をチェック',
    '価格は入会後に表示', '写真と詳細は入会後に表示', 'ブロンズ会員になる', 'この骨董品を詳しく見る',
    'この商品を詳しく見る', 'ブロンズ会員になると、写真・価格・商品説明をすべて確認し、入札や取引に参加できます。',
    '鮮明な写真と商品情報', '詳細の確認と取引', 'ブロンズ会員になって詳細を見る', 'シルバー・ゴールド会員も利用できます', 'ブロンズ会員になって取引に参加'
  ],
  ko: [
    '브론즈 회원 전용', '브론즈 회원부터 상품 전체 정보와 거래를 이용할 수 있습니다', '이 골동품 잠금 해제', '이 중고 상품 잠금 해제',
    '가입 후 가격 공개', '가입 후 사진과 상세 정보 공개', '브론즈 회원 가입', '이 골동품을 자세히 보세요',
    '이 상품을 자세히 보세요', '브론즈 회원은 전체 사진, 가격, 상품 설명을 확인하고 입찰과 거래에 참여할 수 있습니다.',
    '선명한 사진과 상품 정보', '상세 정보와 거래', '브론즈 가입 후 전체 보기', '실버·골드 회원도 이용할 수 있습니다', '브론즈 회원으로 시장 거래 참여'
  ]
}

export const marketAccessMessages = Object.fromEntries(
  Object.entries(translations).map(([locale, values]) => [
    locale,
    Object.fromEntries(keys.map((key, index) => [key, values[index]]))
  ])
)
