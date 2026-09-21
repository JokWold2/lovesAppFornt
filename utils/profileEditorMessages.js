// UI options are also the literal text submitted when the user selects them.
// Stored profile content is displayed as returned; these messages do not translate it.
export const profileEditorMessages = {
  'zh-Hans': {
    groups: { introduction: '自我介绍', basic: '基本资料', personal: '个人资料', education: '教育经历', employment: '工作', helper: '协助者资料', lifestyle: '生活与信仰', personality: '性格与匹配' },
    fields: {
      Selfintroduction: '自我介绍', bio: '签名', health: '健康状况', generation: '代别', blessing_type: '祝福类型', gender: '性别', region: '地区', country: '国家或地区',
      native_last_name: '本名姓氏', native_first_name: '本名名字', en_last_name: '英文姓氏', en_first_name: '英文名字', birth_date: '出生日期', calendar_type: '历法', height: '身高', weight: '体重', blood_type: '血型', blood_rh: 'RH 血型', nationality: '国籍',
      qualification1: '资格 1', qualification2: '资格 2', preferred_country1: '首选国家', preferred_country2: '第二选择国家', lang1_name: '语言 1', lang1_level: '语言 1 熟练度', lang2_name: '语言 2', lang2_level: '语言 2 熟练度',
      degree_level: '学历', degree_status: '学业状态', school_name: '学校', major: '专业', occupation: '职业', company_name: '公司', helper_name: '协助者姓名', helper_mobile: '协助者电话', helper_email: '协助者邮箱',
      hobby1: '爱好 1', hobby2: '爱好 2', faith_life: '我的信仰生活', spouse_faith_life: '我希望配偶的信仰生活', tool_hands: '双手交握', tool_yinyang: '阴阳', tool_five_elements: '五行', tool_enneagram: '九型人格', tool_mbti: 'MBTI'
    },
    options: {
      health: { healthy: '健康', special: '特殊需求' }, generation: { blessing: '祝福子女', first: '第一代', second: '第二代' }, blessing: { first: '第一次祝福', again: '重新祝福' }, gender: { male: '男', female: '女' },
      region: { asia: '亚洲', europe: '欧洲', americas: '美洲', africa: '非洲', oceania: '大洋洲' }, country: { hongKong: '香港', taiwan: '台湾', japan: '日本', korea: '韩国', singapore: '新加坡' }, preferredCountry: { all: '所有国家' }, calendar: { solar: '阳历', lunar: '阴历' }, blood: { a: 'A 型', b: 'B 型', o: 'O 型', ab: 'AB 型' },
      language: { english: '英语', japanese: '日语', korean: '韩语', chinese: '中文', spanish: '西班牙语' }, level: { fluent: '流利', fair: '一般', basic: '一点点' }, degree: { junior: '初中', high: '高中', college: '学院 / 大学', master: '硕士', doctor: '博士' }, degreeStatus: { graduated: '毕业', interrupted: '肄业', studying: '就读中' },
      hands: { left: '左手', right: '右手' }, yinYang: { yang: '阳', yin: '阴' }, fiveElements: { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }, enneagram: { 1: '1：改革型', 2: '2：助人型', 3: '3：成就型', 4: '4：艺术型', 5: '5：智慧型', 6: '6：忠诚型', 7: '7：远见型', 8: '8：领导型', 9: '9：和平型' }
    },
    errors: { date: '请选择有效且不晚于今天的出生日期', number: '请输入有效数字', height: '请输入有效的正整数身高', weight: '请输入有效的正整数体重', email: '请输入有效的邮箱地址', tooLong: '内容过长，请缩短后重试' },
    common: { title: '编辑个人资料', edit: '编辑', save: '保存', saving: '正在保存', saved: '资料已保存', saveFailed: '保存失败，请重试', close: '关闭', confirm: '确认', cancel: '取消', unfilled: '待填写', empty: '待填写', currentValue: '当前内容', unsavedTitle: '放弃未保存的修改？', unsavedMessage: '还有未保存的修改，离开后将丢失。', discard: '放弃修改', keepEditing: '继续编辑', completeProfile: '完善资料', preview: '预览资料', fieldPlaceholder: '填写{field}', loadFailed: '资料加载失败', retry: '重试', completion: '资料完善度 {percent}%', completionCount: '已完成 {completed} / {total} 项', missingCount: '还有 {count} 项待完善', complete: '资料已完善', photos: '管理照片', parentsEmpty: '暂无父母资料' }
  },
  'zh-Hant': {
    groups: { introduction: '自我介紹', basic: '基本資料', personal: '個人資料', education: '教育經歷', employment: '工作', helper: '協助者資料', lifestyle: '生活與信仰', personality: '性格與配對' },
    fields: {
      Selfintroduction: '自我介紹', bio: '簽名', health: '健康狀況', generation: '代別', blessing_type: '祝福類型', gender: '性別', region: '地區', country: '國家或地區',
      native_last_name: '本名姓氏', native_first_name: '本名名字', en_last_name: '英文姓氏', en_first_name: '英文名字', birth_date: '出生日期', calendar_type: '曆法', height: '身高', weight: '體重', blood_type: '血型', blood_rh: 'RH 血型', nationality: '國籍',
      qualification1: '資格 1', qualification2: '資格 2', preferred_country1: '首選國家', preferred_country2: '第二選擇國家', lang1_name: '語言 1', lang1_level: '語言 1 熟練度', lang2_name: '語言 2', lang2_level: '語言 2 熟練度',
      degree_level: '學歷', degree_status: '學業狀態', school_name: '學校', major: '科系', occupation: '職業', company_name: '公司', helper_name: '協助者姓名', helper_mobile: '協助者電話', helper_email: '協助者電子郵件',
      hobby1: '愛好 1', hobby2: '愛好 2', faith_life: '我的信仰生活', spouse_faith_life: '我希望配偶的信仰生活', tool_hands: '雙手交握', tool_yinyang: '陰陽', tool_five_elements: '五行', tool_enneagram: '九型人格', tool_mbti: 'MBTI'
    },
    options: {
      health: { healthy: '健康', special: '特殊需求' }, generation: { blessing: '祝福子女', first: '第一代', second: '第二代' }, blessing: { first: '第一次祝福', again: '重新祝福' }, gender: { male: '男', female: '女' },
      region: { asia: '亞洲', europe: '歐洲', americas: '美洲', africa: '非洲', oceania: '大洋洲' }, country: { hongKong: '香港', taiwan: '台灣', japan: '日本', korea: '韓國', singapore: '新加坡' }, preferredCountry: { all: '所有國家' }, calendar: { solar: '陽曆', lunar: '陰曆' }, blood: { a: 'A 型', b: 'B 型', o: 'O 型', ab: 'AB 型' },
      language: { english: '英語', japanese: '日語', korean: '韓語', chinese: '中文', spanish: '西班牙語' }, level: { fluent: '流利', fair: '一般', basic: '一點點' }, degree: { junior: '國中', high: '高中', college: '學院 / 大學', master: '碩士', doctor: '博士' }, degreeStatus: { graduated: '畢業', interrupted: '肄業', studying: '就讀中' },
      hands: { left: '左手', right: '右手' }, yinYang: { yang: '陽', yin: '陰' }, fiveElements: { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }, enneagram: { 1: '1：改革型', 2: '2：助人型', 3: '3：成就型', 4: '4：藝術型', 5: '5：智慧型', 6: '6：忠誠型', 7: '7：遠見型', 8: '8：領導型', 9: '9：和平型' }
    },
    errors: { date: '請選擇有效且不晚於今天的出生日期', number: '請輸入有效數字', height: '請輸入有效的正整數身高', weight: '請輸入有效的正整數體重', email: '請輸入有效的電子郵件地址', tooLong: '內容過長，請縮短後重試' },
    common: { title: '編輯個人資料', edit: '編輯', save: '儲存', saving: '正在儲存', saved: '資料已儲存', saveFailed: '儲存失敗，請重試', close: '關閉', confirm: '確認', cancel: '取消', unfilled: '待填寫', empty: '待填寫', currentValue: '目前內容', unsavedTitle: '放棄尚未儲存的修改？', unsavedMessage: '還有尚未儲存的修改，離開後將遺失。', discard: '放棄修改', keepEditing: '繼續編輯', completeProfile: '完善資料', preview: '預覽資料', fieldPlaceholder: '填寫{field}', loadFailed: '資料載入失敗', retry: '重試', completion: '資料完善度 {percent}%', completionCount: '已完成 {completed} / {total} 項', missingCount: '還有 {count} 項待完善', complete: '資料已完善', photos: '管理照片', parentsEmpty: '暫無父母資料' }
  },
  en: {
    groups: { introduction: 'About me', basic: 'Basic information', personal: 'Personal details', education: 'Education', employment: 'Work', helper: 'Helper details', lifestyle: 'Life and faith', personality: 'Personality and compatibility' },
    fields: {
      Selfintroduction: 'About me', bio: 'Bio', health: 'Health', generation: 'Generation', blessing_type: 'Blessing type', gender: 'Gender', region: 'Region', country: 'Country or region',
      native_last_name: 'Family name in native language', native_first_name: 'Given name in native language', en_last_name: 'Family name in English', en_first_name: 'Given name in English', birth_date: 'Date of birth', calendar_type: 'Calendar', height: 'Height', weight: 'Weight', blood_type: 'Blood type', blood_rh: 'Rh factor', nationality: 'Nationality',
      qualification1: 'Qualification 1', qualification2: 'Qualification 2', preferred_country1: 'First-choice country', preferred_country2: 'Second-choice country', lang1_name: 'Language 1', lang1_level: 'Language 1 proficiency', lang2_name: 'Language 2', lang2_level: 'Language 2 proficiency',
      degree_level: 'Education level', degree_status: 'Study status', school_name: 'School', major: 'Major', occupation: 'Occupation', company_name: 'Company', helper_name: 'Helper name', helper_mobile: 'Helper phone', helper_email: 'Helper email',
      hobby1: 'Interest 1', hobby2: 'Interest 2', faith_life: 'My life of faith', spouse_faith_life: 'The life of faith I hope for in a spouse', tool_hands: 'Hand clasp', tool_yinyang: 'Yin and yang', tool_five_elements: 'Five elements', tool_enneagram: 'Enneagram', tool_mbti: 'MBTI'
    },
    options: {
      health: { healthy: 'Healthy', special: 'Special needs' }, generation: { blessing: 'Blessed child', first: 'First generation', second: 'Second generation' }, blessing: { first: 'First Blessing', again: 'Reblessing' }, gender: { male: 'Male', female: 'Female' },
      region: { asia: 'Asia', europe: 'Europe', americas: 'Americas', africa: 'Africa', oceania: 'Oceania' }, country: { hongKong: 'Hong Kong', taiwan: 'Taiwan', japan: 'Japan', korea: 'South Korea', singapore: 'Singapore' }, preferredCountry: { all: 'All countries' }, calendar: { solar: 'Solar calendar', lunar: 'Lunar calendar' }, blood: { a: 'A', b: 'B', o: 'O', ab: 'AB' },
      language: { english: 'English', japanese: 'Japanese', korean: 'Korean', chinese: 'Chinese', spanish: 'Spanish' }, level: { fluent: 'Fluent', fair: 'Intermediate', basic: 'Basic' }, degree: { junior: 'Middle school', high: 'High school', college: 'College / University', master: "Master’s degree", doctor: 'Doctorate' }, degreeStatus: { graduated: 'Graduated', interrupted: 'Did not graduate', studying: 'Currently studying' },
      hands: { left: 'Left hand', right: 'Right hand' }, yinYang: { yang: 'Yang', yin: 'Yin' }, fiveElements: { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' }, enneagram: { 1: '1: Reformer', 2: '2: Helper', 3: '3: Achiever', 4: '4: Artist', 5: '5: Thinker', 6: '6: Loyalist', 7: '7: Visionary', 8: '8: Leader', 9: '9: Peacemaker' }
    },
    errors: { date: 'Choose a valid birth date no later than today', number: 'Enter a valid number', height: 'Enter a valid positive whole number for height', weight: 'Enter a valid positive whole number for weight', email: 'Enter a valid email address', tooLong: 'This is too long. Shorten it and try again.' },
    common: { title: 'Edit profile', edit: 'Edit', save: 'Save', saving: 'Saving', saved: 'Profile saved', saveFailed: 'Could not save. Try again.', close: 'Close', confirm: 'Confirm', cancel: 'Cancel', unfilled: 'Not filled in', empty: 'Not filled in', currentValue: 'Current content', unsavedTitle: 'Discard unsaved changes?', unsavedMessage: 'You have unsaved changes. Leaving will discard them.', discard: 'Discard changes', keepEditing: 'Keep editing', completeProfile: 'Complete profile', preview: 'Preview profile', fieldPlaceholder: 'Enter {field}', loadFailed: 'Could not load your profile', retry: 'Retry', completion: 'Profile completion {percent}%', completionCount: '{completed} of {total} items complete', missingCount: '{count} sections left to complete', complete: 'Profile complete', photos: 'Manage photos', parentsEmpty: 'No parent details yet' }
  },
  ru: {
    groups: { introduction: 'О себе', basic: 'Основные сведения', personal: 'Личные данные', education: 'Образование', employment: 'Работа', helper: 'Данные помощника', lifestyle: 'Жизнь и вера', personality: 'Личность и совместимость' },
    fields: {
      Selfintroduction: 'О себе', bio: 'Коротко о себе', health: 'Состояние здоровья', generation: 'Поколение', blessing_type: 'Тип Благословения', gender: 'Пол', region: 'Регион', country: 'Страна или регион',
      native_last_name: 'Фамилия на родном языке', native_first_name: 'Имя на родном языке', en_last_name: 'Фамилия на английском', en_first_name: 'Имя на английском', birth_date: 'Дата рождения', calendar_type: 'Календарь', height: 'Рост', weight: 'Вес', blood_type: 'Группа крови', blood_rh: 'Резус-фактор', nationality: 'Гражданство',
      qualification1: 'Квалификация 1', qualification2: 'Квалификация 2', preferred_country1: 'Страна первого выбора', preferred_country2: 'Страна второго выбора', lang1_name: 'Язык 1', lang1_level: 'Уровень владения языком 1', lang2_name: 'Язык 2', lang2_level: 'Уровень владения языком 2',
      degree_level: 'Уровень образования', degree_status: 'Статус обучения', school_name: 'Учебное заведение', major: 'Специальность', occupation: 'Профессия', company_name: 'Компания', helper_name: 'Имя помощника', helper_mobile: 'Телефон помощника', helper_email: 'Эл. почта помощника',
      hobby1: 'Увлечение 1', hobby2: 'Увлечение 2', faith_life: 'Моя жизнь в вере', spouse_faith_life: 'Какой я вижу жизнь в вере будущего супруга', tool_hands: 'Сцепление рук', tool_yinyang: 'Инь и ян', tool_five_elements: 'Пять элементов', tool_enneagram: 'Эннеаграмма', tool_mbti: 'MBTI'
    },
    options: {
      health: { healthy: 'Здоров(а)', special: 'Особые потребности' }, generation: { blessing: 'Благословлённый ребёнок', first: 'Первое поколение', second: 'Второе поколение' }, blessing: { first: 'Первое Благословение', again: 'Повторное Благословение' }, gender: { male: 'Мужской', female: 'Женский' },
      region: { asia: 'Азия', europe: 'Европа', americas: 'Америка', africa: 'Африка', oceania: 'Океания' }, country: { hongKong: 'Гонконг', taiwan: 'Тайвань', japan: 'Япония', korea: 'Южная Корея', singapore: 'Сингапур' }, preferredCountry: { all: 'Все страны' }, calendar: { solar: 'Солнечный календарь', lunar: 'Лунный календарь' }, blood: { a: 'A', b: 'B', o: 'O', ab: 'AB' },
      language: { english: 'Английский', japanese: 'Японский', korean: 'Корейский', chinese: 'Китайский', spanish: 'Испанский' }, level: { fluent: 'Свободно', fair: 'Средний уровень', basic: 'Начальный уровень' }, degree: { junior: 'Основное общее образование', high: 'Среднее общее образование', college: 'Колледж / Университет', master: 'Магистратура', doctor: 'Докторская степень' }, degreeStatus: { graduated: 'Окончено', interrupted: 'Не окончено', studying: 'Учусь сейчас' },
      hands: { left: 'Левая рука', right: 'Правая рука' }, yinYang: { yang: 'Ян', yin: 'Инь' }, fiveElements: { wood: 'Дерево', fire: 'Огонь', earth: 'Земля', metal: 'Металл', water: 'Вода' }, enneagram: { 1: '1: Реформатор', 2: '2: Помощник', 3: '3: Достигатель', 4: '4: Творец', 5: '5: Мыслитель', 6: '6: Верный', 7: '7: Провидец', 8: '8: Лидер', 9: '9: Миротворец' }
    },
    errors: { date: 'Выберите корректную дату рождения не позднее сегодняшней', number: 'Введите корректное число', height: 'Введите рост целым положительным числом', weight: 'Введите вес целым положительным числом', email: 'Введите корректный адрес эл. почты', tooLong: 'Слишком длинный текст. Сократите его и повторите.' },
    common: { title: 'Редактирование профиля', edit: 'Изменить', save: 'Сохранить', saving: 'Сохраняем', saved: 'Профиль сохранён', saveFailed: 'Не удалось сохранить. Повторите попытку.', close: 'Закрыть', confirm: 'Подтвердить', cancel: 'Отмена', unfilled: 'Не заполнено', empty: 'Не заполнено', currentValue: 'Текущее значение', unsavedTitle: 'Отменить несохранённые изменения?', unsavedMessage: 'У вас есть несохранённые изменения. При выходе они будут потеряны.', discard: 'Отменить изменения', keepEditing: 'Продолжить редактирование', completeProfile: 'Заполнить профиль', preview: 'Посмотреть профиль', fieldPlaceholder: 'Заполните поле «{field}»', loadFailed: 'Не удалось загрузить профиль', retry: 'Повторить', completion: 'Профиль заполнен на {percent}%', completionCount: 'Заполнено пунктов: {completed} из {total}', missingCount: 'Осталось заполнить разделов: {count}', complete: 'Профиль заполнен', photos: 'Управление фотографиями', parentsEmpty: 'Данные о родителях пока не указаны' }
  },
  ja: {
    groups: { introduction: '自己紹介', basic: '基本情報', personal: '個人情報', education: '学歴', employment: '仕事', helper: 'サポーター情報', lifestyle: '暮らしと信仰', personality: '性格と相性' },
    fields: {
      Selfintroduction: '自己紹介', bio: 'ひとこと', health: '健康状態', generation: '世代', blessing_type: '祝福の種類', gender: '性別', region: '地域', country: '国・地域',
      native_last_name: '母語の姓', native_first_name: '母語の名', en_last_name: '英語表記の姓', en_first_name: '英語表記の名', birth_date: '生年月日', calendar_type: '暦', height: '身長', weight: '体重', blood_type: '血液型', blood_rh: 'Rh 因子', nationality: '国籍',
      qualification1: '資格 1', qualification2: '資格 2', preferred_country1: '第一希望の国', preferred_country2: '第二希望の国', lang1_name: '言語 1', lang1_level: '言語 1 の習熟度', lang2_name: '言語 2', lang2_level: '言語 2 の習熟度',
      degree_level: '最終学歴', degree_status: '修学状況', school_name: '学校名', major: '専攻', occupation: '職業', company_name: '会社名', helper_name: 'サポーターの氏名', helper_mobile: 'サポーターの電話番号', helper_email: 'サポーターのメールアドレス',
      hobby1: '趣味 1', hobby2: '趣味 2', faith_life: '私の信仰生活', spouse_faith_life: '配偶者に望む信仰生活', tool_hands: '両手の組み方', tool_yinyang: '陰陽', tool_five_elements: '五行', tool_enneagram: 'エニアグラム', tool_mbti: 'MBTI'
    },
    options: {
      health: { healthy: '健康', special: '特別な配慮が必要' }, generation: { blessing: '祝福子女', first: '一世', second: '二世' }, blessing: { first: '初めての祝福', again: '再祝福' }, gender: { male: '男性', female: '女性' },
      region: { asia: 'アジア', europe: 'ヨーロッパ', americas: 'アメリカ大陸', africa: 'アフリカ', oceania: 'オセアニア' }, country: { hongKong: '香港', taiwan: '台湾', japan: '日本', korea: '韓国', singapore: 'シンガポール' }, preferredCountry: { all: 'すべての国' }, calendar: { solar: '太陽暦', lunar: '太陰暦' }, blood: { a: 'A 型', b: 'B 型', o: 'O 型', ab: 'AB 型' },
      language: { english: '英語', japanese: '日本語', korean: '韓国語', chinese: '中国語', spanish: 'スペイン語' }, level: { fluent: '流暢', fair: '日常会話程度', basic: '少し話せる' }, degree: { junior: '中学校', high: '高等学校', college: '短期大学・大学', master: '修士', doctor: '博士' }, degreeStatus: { graduated: '卒業', interrupted: '中退', studying: '在学中' },
      hands: { left: '左手', right: '右手' }, yinYang: { yang: '陽', yin: '陰' }, fiveElements: { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }, enneagram: { 1: '1：改革する人', 2: '2：人を助ける人', 3: '3：達成する人', 4: '4：芸術家', 5: '5：考える人', 6: '6：忠実な人', 7: '7：先を見通す人', 8: '8：率いる人', 9: '9：平和をもたらす人' }
    },
    errors: { date: '今日以前の有効な生年月日を選択してください', number: '有効な数値を入力してください', height: '身長を正の整数で入力してください', weight: '体重を正の整数で入力してください', email: '有効なメールアドレスを入力してください', tooLong: '入力内容が長すぎます。短くしてやり直してください。' },
    common: { title: 'プロフィールを編集', edit: '編集', save: '保存', saving: '保存中', saved: 'プロフィールを保存しました', saveFailed: '保存できませんでした。もう一度お試しください。', close: '閉じる', confirm: '確定', cancel: 'キャンセル', unfilled: '未入力', empty: '未入力', currentValue: '現在の内容', unsavedTitle: '未保存の変更を破棄しますか？', unsavedMessage: '保存していない変更があります。離れると変更は失われます。', discard: '変更を破棄', keepEditing: '編集を続ける', completeProfile: 'プロフィールを充実させる', preview: 'プロフィールを確認', fieldPlaceholder: '{field}を入力', loadFailed: 'プロフィールを読み込めませんでした', retry: '再試行', completion: 'プロフィール完成度 {percent}%', completionCount: '{total} 項目中 {completed} 項目が完了', missingCount: 'あと {count} 項目で完了', complete: 'プロフィールが完成しました', photos: '写真を管理', parentsEmpty: '父母の情報はまだありません' }
  },
  ko: {
    groups: { introduction: '자기소개', basic: '기본 정보', personal: '개인 정보', education: '학력', employment: '직장', helper: '도우미 정보', lifestyle: '생활과 신앙', personality: '성격과 궁합' },
    fields: {
      Selfintroduction: '자기소개', bio: '한 줄 소개', health: '건강 상태', generation: '세대', blessing_type: '축복 유형', gender: '성별', region: '지역', country: '국가 또는 지역',
      native_last_name: '모국어 성', native_first_name: '모국어 이름', en_last_name: '영문 성', en_first_name: '영문 이름', birth_date: '생년월일', calendar_type: '달력 기준', height: '키', weight: '몸무게', blood_type: '혈액형', blood_rh: 'Rh 혈액형', nationality: '국적',
      qualification1: '자격 1', qualification2: '자격 2', preferred_country1: '첫 번째 선호 국가', preferred_country2: '두 번째 선호 국가', lang1_name: '언어 1', lang1_level: '언어 1 구사 수준', lang2_name: '언어 2', lang2_level: '언어 2 구사 수준',
      degree_level: '학력', degree_status: '학업 상태', school_name: '학교', major: '전공', occupation: '직업', company_name: '회사', helper_name: '도우미 이름', helper_mobile: '도우미 전화번호', helper_email: '도우미 이메일',
      hobby1: '취미 1', hobby2: '취미 2', faith_life: '나의 신앙생활', spouse_faith_life: '배우자에게 바라는 신앙생활', tool_hands: '손깍지', tool_yinyang: '음양', tool_five_elements: '오행', tool_enneagram: '에니어그램', tool_mbti: 'MBTI'
    },
    options: {
      health: { healthy: '건강함', special: '특별한 지원 필요' }, generation: { blessing: '축복 자녀', first: '1세대', second: '2세대' }, blessing: { first: '첫 축복', again: '재축복' }, gender: { male: '남성', female: '여성' },
      region: { asia: '아시아', europe: '유럽', americas: '아메리카', africa: '아프리카', oceania: '오세아니아' }, country: { hongKong: '홍콩', taiwan: '대만', japan: '일본', korea: '한국', singapore: '싱가포르' }, preferredCountry: { all: '모든 국가' }, calendar: { solar: '양력', lunar: '음력' }, blood: { a: 'A형', b: 'B형', o: 'O형', ab: 'AB형' },
      language: { english: '영어', japanese: '일본어', korean: '한국어', chinese: '중국어', spanish: '스페인어' }, level: { fluent: '유창함', fair: '보통', basic: '기초' }, degree: { junior: '중학교', high: '고등학교', college: '전문대학 / 대학교', master: '석사', doctor: '박사' }, degreeStatus: { graduated: '졸업', interrupted: '중퇴', studying: '재학 중' },
      hands: { left: '왼손', right: '오른손' }, yinYang: { yang: '양', yin: '음' }, fiveElements: { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' }, enneagram: { 1: '1: 개혁가', 2: '2: 조력가', 3: '3: 성취가', 4: '4: 예술가', 5: '5: 사색가', 6: '6: 충성가', 7: '7: 선구자', 8: '8: 지도자', 9: '9: 평화주의자' }
    },
    errors: { date: '오늘 이전의 올바른 생년월일을 선택해 주세요', number: '올바른 숫자를 입력해 주세요', height: '키를 올바른 양의 정수로 입력해 주세요', weight: '몸무게를 올바른 양의 정수로 입력해 주세요', email: '올바른 이메일 주소를 입력해 주세요', tooLong: '내용이 너무 깁니다. 줄인 뒤 다시 시도해 주세요.' },
    common: { title: '프로필 편집', edit: '편집', save: '저장', saving: '저장 중', saved: '프로필을 저장했습니다', saveFailed: '저장하지 못했습니다. 다시 시도해 주세요.', close: '닫기', confirm: '확인', cancel: '취소', unfilled: '미입력', empty: '미입력', currentValue: '현재 내용', unsavedTitle: '저장하지 않은 변경 사항을 버릴까요?', unsavedMessage: '저장하지 않은 변경 사항이 있습니다. 나가면 변경 내용이 사라집니다.', discard: '변경 사항 버리기', keepEditing: '계속 편집', completeProfile: '프로필 완성하기', preview: '프로필 미리 보기', fieldPlaceholder: '{field} 입력', loadFailed: '프로필을 불러오지 못했습니다', retry: '다시 시도', completion: '프로필 완성도 {percent}%', completionCount: '{total}개 항목 중 {completed}개 완료', missingCount: '{count}개 항목이 남았습니다', complete: '프로필이 완성되었습니다', photos: '사진 관리', parentsEmpty: '아직 부모님 정보가 없습니다' }
  }
}

const additionalCommon = {
  'zh-Hans': { clear: '清空', completionLabel: '资料完善度' },
  'zh-Hant': { clear: '清空', completionLabel: '資料完善度' },
  en: { clear: 'Clear', completionLabel: 'Profile completion' },
  ru: { clear: 'Очистить', completionLabel: 'Заполнение профиля' },
  ja: { clear: 'クリア', completionLabel: 'プロフィール完成度' },
  ko: { clear: '비우기', completionLabel: '프로필 완성도' }
}
for (const [locale, common] of Object.entries(additionalCommon)) {
  Object.assign(profileEditorMessages[locale].common, common)
}

const catalogMessages = {
  'zh-Hans': { choose: '请选择', search: '搜索', searchCountries: '搜索国家或地区', searchLanguages: '搜索语言', clearSearch: '清空搜索', noResults: '没有找到，换个名称再试试', results: '{count} 项', loadMore: '加载更多' },
  'zh-Hant': { choose: '請選擇', search: '搜尋', searchCountries: '搜尋國家或地區', searchLanguages: '搜尋語言', clearSearch: '清空搜尋', noResults: '找不到結果，換個名稱再試試', results: '{count} 項', loadMore: '載入更多' },
  en: { choose: 'Choose', search: 'Search', searchCountries: 'Search countries or regions', searchLanguages: 'Search languages', clearSearch: 'Clear search', noResults: 'No matches. Try another name.', results: '{count} options', loadMore: 'Load more' },
  ru: { choose: 'Выбрать', search: 'Поиск', searchCountries: 'Поиск страны или региона', searchLanguages: 'Поиск языка', clearSearch: 'Очистить поиск', noResults: 'Ничего не найдено. Попробуйте другое название.', results: 'Вариантов: {count}', loadMore: 'Показать ещё' },
  ja: { choose: '選択する', search: '検索', searchCountries: '国・地域を検索', searchLanguages: '言語を検索', clearSearch: '検索をクリア', noResults: '見つかりませんでした。別の名前で検索してください。', results: '{count} 件', loadMore: 'もっと見る' },
  ko: { choose: '선택하기', search: '검색', searchCountries: '국가 또는 지역 검색', searchLanguages: '언어 검색', clearSearch: '검색어 지우기', noResults: '검색 결과가 없습니다. 다른 이름으로 검색해 주세요.', results: '{count}개', loadMore: '더 보기' }
}
for (const [locale, catalog] of Object.entries(catalogMessages)) profileEditorMessages[locale].catalog = catalog
