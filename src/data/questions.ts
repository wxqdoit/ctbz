export type DimensionId =
  | "organization"
  | "decision"
  | "communication"
  | "talent"
  | "delivery"
  | "customer"
  | "finance"
  | "quality"
  | "culture"
  | "risk";

export type OptionId = "A" | "B" | "C" | "D";

export type QuestionOption = {
  id: OptionId;
  label: string;
  attribute: string;
  score: number;
  weights: Record<DimensionId, number>;
};

export type Question = {
  id: string;
  category: string;
  text: string;
  attribute: string;
  weights: Record<DimensionId, number>;
  options: QuestionOption[];
};

export type ResultLevel = {
  name: string;
  range: [number, number];
  verdict: string;
  description: string;
  tone: "stable" | "healthy" | "warning" | "danger" | "collapse";
};

type Dimension = {
  id: DimensionId;
  name: string;
};

type RawQuestion = {
  id: number;
  category: string;
  dimension: DimensionId;
  text: string;
  options: Record<OptionId, string>;
};

const dimensions: Dimension[] = [
  { id: "organization", name: "组织与制度" },
  { id: "decision", name: "目标与决策" },
  { id: "communication", name: "会议与沟通" },
  { id: "talent", name: "入职与人才" },
  { id: "delivery", name: "项目与执行" },
  { id: "customer", name: "客户与业务" },
  { id: "finance", name: "薪酬与财务" },
  { id: "quality", name: "工具与质量" },
  { id: "culture", name: "文化与氛围" },
  { id: "risk", name: "合规与危机" },
];

const rawQuestions = [
  {
    "id": 1,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "你入职第一天更像哪种情况？",
    "options": {
      "A": "工位、电脑、账号都准备好了",
      "B": "缺几个权限，但当天能补齐",
      "C": "HR和部门互相踢皮球，不知道谁带你",
      "D": "人都到公司了，前台说没人通知今天有人入职"
    }
  },
  {
    "id": 2,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "面试时对方怎么介绍岗位？",
    "options": {
      "A": "职责、目标、汇报线都说清楚",
      "B": "大方向有，细节要入职后再看",
      "C": "说“岗位比较灵活，来了啥都能接触”",
      "D": "面试官自己都说不清这个岗到底干嘛"
    }
  },
  {
    "id": 3,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "HR谈薪时最接近哪种？",
    "options": {
      "A": "底薪、绩效、奖金、社保都写明",
      "B": "大体说清楚，但细节要等offer",
      "C": "总说“放心，公司不会亏待你”",
      "D": "一问薪资结构就开始画饼、转移话题"
    }
  },
  {
    "id": 4,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "你收到offer的方式是？",
    "options": {
      "A": "正式邮件，信息完整",
      "B": "微信确认，后续补正式offer",
      "C": "口头说“你过了，下周来吧”",
      "D": "没offer、没合同，直接让你先上班"
    }
  },
  {
    "id": 5,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "公司对试用期的说法是？",
    "options": {
      "A": "有明确周期和转正标准",
      "B": "有标准，但说得比较模糊",
      "C": "说“主要看老板感觉”",
      "D": "快转正了才突然说你不合适"
    }
  },
  {
    "id": 6,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "面试作业是什么体验？",
    "options": {
      "A": "简单测试能力，不涉及真实业务",
      "B": "有点费时间，但范围合理",
      "C": "让你做完整方案，还不给反馈",
      "D": "做完方案后人间蒸发，像他妈来白嫖"
    }
  },
  {
    "id": 7,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "面试官状态如何？",
    "options": {
      "A": "准时、看过简历、问题专业",
      "B": "有点赶，但基本尊重人",
      "C": "一边看手机一边问你经历",
      "D": "迟到半小时，还问“你是来面啥岗的”"
    }
  },
  {
    "id": 8,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "招聘JD给你的感觉是？",
    "options": {
      "A": "职责清楚，要求匹配薪资",
      "B": "写得有点大，但还能理解",
      "C": "想要全栈六边形战士，钱给得像实习生",
      "D": "一句话总结：低薪招神仙牛马"
    }
  },
  {
    "id": 9,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "背调或资料收集怎么做？",
    "options": {
      "A": "只要必要信息，流程规范",
      "B": "问得稍微多，但能解释原因",
      "C": "要一堆隐私，还说“大家都这样”",
      "D": "入职前就让你交离谱材料，像查户口"
    }
  },
  {
    "id": 10,
    "category": "入职与招聘",
    "dimension": "talent",
    "text": "公司介绍自己时最常说什么？",
    "options": {
      "A": "业务、客户、产品、收入都讲得明白",
      "B": "讲了发展方向，但数据不多",
      "C": "满嘴生态、闭环、赋能、飞轮",
      "D": "讲半天不知道怎么赚钱，只知道“未来很大”"
    }
  },
  {
    "id": 11,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "你的汇报线是怎样的？",
    "options": {
      "A": "一个直属领导，职责明确",
      "B": "偶尔跨部门汇报",
      "C": "两三个领导都能给你派活",
      "D": "谁路过谁都能指挥你，最后锅还算你的"
    }
  },
  {
    "id": 12,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "领导布置任务通常怎么说？",
    "options": {
      "A": "目标、背景、截止时间都明确",
      "B": "先给大方向，再一起细化",
      "C": "“你先搞个差不多的”",
      "D": "“我也不知道要啥，但你先做，做了我再看”"
    }
  },
  {
    "id": 13,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "公司说“扁平化管理”实际像什么？",
    "options": {
      "A": "沟通链路短，决策快",
      "B": "可以直接找关键人",
      "C": "老板越过所有层级瞎插手",
      "D": "扁平到没人负责，出了事全员装死"
    }
  },
  {
    "id": 14,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "遇到决策冲突时怎么办？",
    "options": {
      "A": "拉齐目标，负责人拍板",
      "B": "多开几轮会再定",
      "C": "谁声音大听谁的",
      "D": "老板一句话推翻所有专业判断"
    }
  },
  {
    "id": 15,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "组织架构调整频率如何？",
    "options": {
      "A": "按业务阶段调整",
      "B": "半年一年有一次变化",
      "C": "每季度换一次部门名",
      "D": "工牌还没印好，部门又没了"
    }
  },
  {
    "id": 16,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "你们公司的管理风格像哪种？",
    "options": {
      "A": "目标清楚，授权充分",
      "B": "过程会盯，但还能沟通",
      "C": "事前不管，事后狂骂",
      "D": "平时装死，炸了出来找人背锅"
    }
  },
  {
    "id": 17,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "领导最常用的管理工具是？",
    "options": {
      "A": "数据、计划、复盘",
      "B": "会议和任务看板",
      "C": "微信催命、群里@所有人",
      "D": "拍桌子、骂人、阴阳怪气"
    }
  },
  {
    "id": 18,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "老板经常说的黑话是？",
    "options": {
      "A": "用户价值、成本收益",
      "B": "对齐目标、同步节奏",
      "C": "格局打开、认知升级",
      "D": "相信相信的力量，但工资先缓缓"
    }
  },
  {
    "id": 19,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "公司是否存在多头管理？",
    "options": {
      "A": "基本没有",
      "B": "偶尔有交叉项目",
      "C": "经常几个老板意见打架",
      "D": "今天听A，明天听B，后天C说你全错"
    }
  },
  {
    "id": 20,
    "category": "组织与管理",
    "dimension": "organization",
    "text": "管理层承担责任吗？",
    "options": {
      "A": "会复盘决策问题",
      "B": "有时会承认判断失误",
      "C": "经常说“下面执行不到位”",
      "D": "功劳上收，锅下甩，基层纯纯背锅侠"
    }
  },
  {
    "id": 21,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "公司年度目标像什么？",
    "options": {
      "A": "有明确业务指标和拆解",
      "B": "有方向，但拆解一般",
      "C": "目标很大，资源很少",
      "D": "全面领先、指数增长、行业第一，听着像算命"
    }
  },
  {
    "id": 22,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "OKR或KPI怎么定？",
    "options": {
      "A": "提前沟通，可衡量",
      "B": "有指标，但部分口径模糊",
      "C": "月底临时改指标",
      "D": "完不成是你的问题，指标离谱不是公司的问题"
    }
  },
  {
    "id": 23,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "战略会通常产出什么？",
    "options": {
      "A": "明确重点、预算、负责人",
      "B": "有大方向，后续慢慢拆",
      "C": "一堆PPT和口号",
      "D": "开两天会，结论是“大家要更拼”"
    }
  },
  {
    "id": 24,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "公司追风口的程度是？",
    "options": {
      "A": "结合业务谨慎判断",
      "B": "偶尔试点新方向",
      "C": "什么火就蹭什么",
      "D": "AI、出海、私域、直播轮流上桌，员工脑子都晕了"
    }
  },
  {
    "id": 25,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "老板讲商业模式时怎样？",
    "options": {
      "A": "客户、收入、成本都清楚",
      "B": "讲得大概能听懂",
      "C": "一问赚钱就说先做规模",
      "D": "问三句就开始讲愿景，像玄学大师开坛"
    }
  },
  {
    "id": 26,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "公司说“长期主义”时通常意味着？",
    "options": {
      "A": "愿意投入研发和品牌",
      "B": "短期利润不急，但有规划",
      "C": "让员工忍一忍",
      "D": "奖金不发、工资拖延，全拿长期主义当遮羞布"
    }
  },
  {
    "id": 27,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "公司战略变化频率如何？",
    "options": {
      "A": "稳定推进",
      "B": "根据市场小幅调整",
      "C": "每月换重点",
      "D": "今天All in这个，明天全面转向那个，跟抽风一样"
    }
  },
  {
    "id": 28,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "你们的业务优先级怎么排？",
    "options": {
      "A": "看价值、成本、风险",
      "B": "领导和业务一起排",
      "C": "谁催得急谁优先",
      "D": "谁离老板近谁的需求插队"
    }
  },
  {
    "id": 29,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "公司最爱给项目起什么名？",
    "options": {
      "A": "简单清楚，方便识别",
      "B": "有代号但能对应业务",
      "C": "破晓、天狼、星火、登月",
      "D": "名字像大片，内容像草台戏班"
    }
  },
  {
    "id": 30,
    "category": "目标与战略",
    "dimension": "decision",
    "text": "高层对现状判断准吗？",
    "options": {
      "A": "基本贴近一线",
      "B": "偶尔乐观",
      "C": "经常脱离实际",
      "D": "下面都快炸了，上面还在PPT里高歌猛进"
    }
  },
  {
    "id": 31,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "公司制度在哪里？",
    "options": {
      "A": "有员工手册和线上文档",
      "B": "有部分文档，不太完整",
      "C": "主要靠老员工口口相传",
      "D": "制度存在于老板心情里"
    }
  },
  {
    "id": 32,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "同一件事规则会变吗？",
    "options": {
      "A": "基本稳定",
      "B": "偶尔根据情况调整",
      "C": "经常今天一套明天一套",
      "D": "上午刚通知，下午就推翻，离谱他妈给离谱开门"
    }
  },
  {
    "id": 33,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "审批流程体验如何？",
    "options": {
      "A": "系统清楚，节点明确",
      "B": "有点慢，但能追踪",
      "C": "卡在人那里没人敢催",
      "D": "最后靠微信一句“老板同意了”硬过"
    }
  },
  {
    "id": 34,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "报销流程怎么样？",
    "options": {
      "A": "周期固定，规则明确",
      "B": "偶尔慢一点",
      "C": "需要反复催财务",
      "D": "财务说“老板最近不想看这个”"
    }
  },
  {
    "id": 35,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "请假流程是什么感受？",
    "options": {
      "A": "正常申请正常批",
      "B": "需要提前说清楚",
      "C": "请假像求恩赐",
      "D": "病假还要自证“你到底有多病”"
    }
  },
  {
    "id": 36,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "考勤制度如何？",
    "options": {
      "A": "清楚且相对公平",
      "B": "有点严格但可接受",
      "C": "迟到扣钱，加班不算",
      "D": "早到没人看，晚走没人算，迟到一分钟就扣你"
    }
  },
  {
    "id": 37,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "加班规则是否明确？",
    "options": {
      "A": "有加班费或调休",
      "B": "特殊项目可申请",
      "C": "基本靠自觉奉献",
      "D": "加班是本分，谈补偿就是格局低"
    }
  },
  {
    "id": 38,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "转岗流程怎样？",
    "options": {
      "A": "提前沟通，书面确认",
      "B": "有沟通但比较急",
      "C": "领导一句话就让你换岗",
      "D": "被拉进新群才知道自己岗位没了"
    }
  },
  {
    "id": 39,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "离职流程顺吗？",
    "options": {
      "A": "交接、证明、薪资都正常",
      "B": "有点拖但能办完",
      "C": "HR各种挽留加拖延",
      "D": "你想走，公司开始给你上价值、扣帽子"
    }
  },
  {
    "id": 40,
    "category": "流程与制度",
    "dimension": "organization",
    "text": "公司处理投诉或申诉如何？",
    "options": {
      "A": "有渠道，有反馈",
      "B": "有渠道但响应慢",
      "C": "反馈后没下文",
      "D": "谁投诉谁倒霉，月底绩效直接寄"
    }
  },
  {
    "id": 41,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "周会通常是什么样？",
    "options": {
      "A": "同步进度和风险",
      "B": "有时发散，但能收回来",
      "C": "领导单口相声",
      "D": "骂一小时，没人知道接下来干啥"
    }
  },
  {
    "id": 42,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "晨会给你的感觉是？",
    "options": {
      "A": "快速对齐当天重点",
      "B": "偶尔拖长",
      "C": "变成每日审判大会",
      "D": "早上刚醒就开始精神服刑"
    }
  },
  {
    "id": 43,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "会议是否有议程？",
    "options": {
      "A": "会前发议题",
      "B": "口头说个大概",
      "C": "到场才知道聊啥",
      "D": "开了半天发现只是领导想发泄"
    }
  },
  {
    "id": 44,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "会后有没有结论？",
    "options": {
      "A": "有纪要、负责人、截止时间",
      "B": "有大概结论",
      "C": "只有“大家推进一下”",
      "D": "会散了，任务像空气一样飘着"
    }
  },
  {
    "id": 45,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "群消息状态如何？",
    "options": {
      "A": "分群清楚，信息有效",
      "B": "偶尔刷屏",
      "C": "群多到爆炸",
      "D": "半夜两点老板发“？”全员装醒"
    }
  },
  {
    "id": 46,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "公司沟通方式更像哪种？",
    "options": {
      "A": "文档沉淀，结论清楚",
      "B": "群聊同步，重要内容再记录",
      "C": "电话说完就算",
      "D": "所有关键决策靠口头，事后没人认账"
    }
  },
  {
    "id": 47,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "跨部门沟通体验如何？",
    "options": {
      "A": "有接口人和流程",
      "B": "需要多催几次",
      "C": "部门之间互相甩锅",
      "D": "一件事拉80个人进群，没人拍板"
    }
  },
  {
    "id": 48,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "领导反馈工作时更像？",
    "options": {
      "A": "指出具体问题",
      "B": "说感受但能补充原因",
      "C": "“感觉不对，不高级”",
      "D": "改来改去，最后改回第一版"
    }
  },
  {
    "id": 49,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "公司是否鼓励说真话？",
    "options": {
      "A": "能提反对意见",
      "B": "可以提，但要讲方式",
      "C": "提了也没用",
      "D": "谁说真话谁被说负能量"
    }
  },
  {
    "id": 50,
    "category": "会议与沟通",
    "dimension": "communication",
    "text": "沟通中最常见的黑话是？",
    "options": {
      "A": "目标、资源、风险",
      "B": "节奏、抓手、闭环",
      "C": "赋能、拉通、对齐、沉淀",
      "D": "说了一堆黑话，翻译成人话就是没人负责"
    }
  },
  {
    "id": 51,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "项目启动时状态如何？",
    "options": {
      "A": "背景、目标、范围都明确",
      "B": "先跑起来再补细节",
      "C": "老板一句“搞起来”就算启动",
      "D": "项目开始三天了，还没人知道要交付啥"
    }
  },
  {
    "id": 52,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "项目排期怎么定？",
    "options": {
      "A": "评估人力和风险",
      "B": "有一定压缩但还能干",
      "C": "领导先拍上线时间",
      "D": "“别人三天能做，你们为啥不行”"
    }
  },
  {
    "id": 53,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "需求来源通常是什么？",
    "options": {
      "A": "用户反馈和业务数据",
      "B": "业务方需求",
      "C": "老板刷到竞品",
      "D": "老板昨晚睡前灵光一现，今天全员爆肝"
    }
  },
  {
    "id": 54,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "需求变更频率如何？",
    "options": {
      "A": "控制得住",
      "B": "偶尔变更",
      "C": "经常边做边改",
      "D": "上午确认下午推翻，晚上还要上线"
    }
  },
  {
    "id": 55,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "项目文档状态如何？",
    "options": {
      "A": "版本清楚，内容完整",
      "B": "有文档但更新慢",
      "C": "多个最终版并存",
      "D": "最终版、最终最终版、打死不改版满天飞"
    }
  },
  {
    "id": 56,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "项目负责人起什么作用？",
    "options": {
      "A": "协调资源、控制风险",
      "B": "主要同步进度",
      "C": "转发领导消息",
      "D": "PM像传声筒，业务像许愿池，研发像冤种"
    }
  },
  {
    "id": 57,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "项目风险怎么处理？",
    "options": {
      "A": "提前暴露，及时调整",
      "B": "有风险但处理偏慢",
      "C": "风险说了也没人理",
      "D": "炸了以后问“你为什么不早说”"
    }
  },
  {
    "id": 58,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "项目上线前有没有测试？",
    "options": {
      "A": "测试充分，有验收",
      "B": "时间紧但会测核心流程",
      "C": "草草点几下就上线",
      "D": "直接全量发，挂了再说命硬"
    }
  },
  {
    "id": 59,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "项目失败后怎么复盘？",
    "options": {
      "A": "找原因，改机制",
      "B": "总结一些经验",
      "C": "重点找谁的问题",
      "D": "复盘会开成批斗会，最后基层背锅"
    }
  },
  {
    "id": 60,
    "category": "项目与执行",
    "dimension": "delivery",
    "text": "项目收尾时如何处理？",
    "options": {
      "A": "验收、归档、复盘",
      "B": "有验收但归档一般",
      "C": "做完就散",
      "D": "项目黄了没人宣布，群安静得像闹鬼"
    }
  },
  {
    "id": 61,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "产品需求是否有用户场景？",
    "options": {
      "A": "场景清楚",
      "B": "有大概用户画像",
      "C": "靠猜",
      "D": "老板说他也是用户，所以他觉得用户会喜欢"
    }
  },
  {
    "id": 62,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "竞品分析怎么做？",
    "options": {
      "A": "分析定位、路径、数据",
      "B": "看功能差异",
      "C": "截几张图就开抄",
      "D": "“竞品有，我们必须有”，然后没人问为什么"
    }
  },
  {
    "id": 63,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "产品上线后的数据怎么看？",
    "options": {
      "A": "有指标，有复盘",
      "B": "看几个核心数",
      "C": "数据不全，靠感觉",
      "D": "数据不好就说数据口径有问题"
    }
  },
  {
    "id": 64,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "公司对用户反馈态度如何？",
    "options": {
      "A": "分类处理，进入需求池",
      "B": "重要反馈会跟",
      "C": "看谁骂得凶",
      "D": "用户骂产品，内部先讨论能不能删帖"
    }
  },
  {
    "id": 65,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "客户需求是否有边界？",
    "options": {
      "A": "合同范围清楚",
      "B": "变更可以谈",
      "C": "销售答应了就得做",
      "D": "客户张嘴许愿，交付通宵还愿"
    }
  },
  {
    "id": 66,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "产品经理决策方式像什么？",
    "options": {
      "A": "结合用户和数据",
      "B": "参考竞品再判断",
      "C": "老板说啥写啥",
      "D": "产品经理成了老板嘴替"
    }
  },
  {
    "id": 67,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "业务数据是否可信？",
    "options": {
      "A": "口径统一，可追溯",
      "B": "有些指标不够准",
      "C": "经常改口径",
      "D": "把注册量、浏览量、群人数混起来吹增长"
    }
  },
  {
    "id": 68,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "公司对商业化的理解是？",
    "options": {
      "A": "付费路径清楚",
      "B": "还在验证阶段",
      "C": "先做规模以后再说",
      "D": "赚钱靠未来，亏钱靠员工理解"
    }
  },
  {
    "id": 69,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "客户成功团队实际在干嘛？",
    "options": {
      "A": "帮客户用好产品",
      "B": "做培训和续费",
      "C": "主要催合同",
      "D": "客户成不成功不重要，续费成功就行"
    }
  },
  {
    "id": 70,
    "category": "产品与业务",
    "dimension": "customer",
    "text": "售后问题怎么处理？",
    "options": {
      "A": "工单分级，限时解决",
      "B": "有人跟，但效率一般",
      "C": "客服复制模板",
      "D": "客户骂一天，公司内部先找谁去挨骂"
    }
  },
  {
    "id": 71,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "工资发放稳定吗？",
    "options": {
      "A": "固定日期到账",
      "B": "偶尔延迟一两天",
      "C": "经常找理由晚发",
      "D": "发工资像抽盲盒，员工天天算命"
    }
  },
  {
    "id": 72,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "社保公积金怎么交？",
    "options": {
      "A": "按实际工资正常缴",
      "B": "基本正常，有小差异",
      "C": "按最低基数缴",
      "D": "试用期不给交，还说行业惯例"
    }
  },
  {
    "id": 73,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "年终奖规则如何？",
    "options": {
      "A": "写明条件和周期",
      "B": "有历史惯例",
      "C": "老板心情决定",
      "D": "年初说很多，年底说公司困难"
    }
  },
  {
    "id": 74,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "绩效工资是否透明？",
    "options": {
      "A": "规则清楚",
      "B": "大体知道怎么算",
      "C": "算法很玄",
      "D": "扣钱有公式，发钱靠缘分"
    }
  },
  {
    "id": 75,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "加班补偿是什么状态？",
    "options": {
      "A": "加班费或调休清楚",
      "B": "偶尔调休不好落",
      "C": "基本没有补偿",
      "D": "加班是福报，提补偿就是不够拼"
    }
  },
  {
    "id": 76,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "公司福利最像哪种？",
    "options": {
      "A": "健康体检、年假、补充保险都有",
      "B": "有一些基础福利",
      "C": "下午茶拍照很好看",
      "D": "奶茶管够，社保拉胯"
    }
  },
  {
    "id": 77,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "涨薪机制如何？",
    "options": {
      "A": "年度调薪，有标准",
      "B": "看绩效和预算",
      "C": "你不提就没有",
      "D": "提了说困难，不提当你满意"
    }
  },
  {
    "id": 78,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "离职结算是否顺利？",
    "options": {
      "A": "工资、补偿按规则结清",
      "B": "稍微拖一点",
      "C": "要反复催",
      "D": "离职后开始找理由扣钱"
    }
  },
  {
    "id": 79,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "公司是否谈期权股权？",
    "options": {
      "A": "协议清楚，归属明确",
      "B": "有计划但细节少",
      "C": "只说未来会有",
      "D": "天天喊合伙人，协议一张没有"
    }
  },
  {
    "id": 80,
    "category": "薪酬福利",
    "dimension": "finance",
    "text": "薪资保密氛围如何？",
    "options": {
      "A": "尊重隐私，但制度公平",
      "B": "不鼓励讨论",
      "C": "谁问谁尴尬",
      "D": "怕员工对薪，说明里面水深得很"
    }
  },
  {
    "id": 81,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "团队氛围真实状态是？",
    "options": {
      "A": "能合作，也能说问题",
      "B": "表面还行",
      "C": "大家都憋着",
      "D": "群里哈哈哈，私下全在骂娘"
    }
  },
  {
    "id": 82,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "新人遇到问题怎么办？",
    "options": {
      "A": "有导师，有文档",
      "B": "问同事能解决",
      "C": "靠自己摸索",
      "D": "丢给你一句“自己悟”，像修仙入门"
    }
  },
  {
    "id": 83,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "老员工状态如何？",
    "options": {
      "A": "有经验，也愿意带人",
      "B": "比较忙但能支持",
      "C": "大多疲惫麻木",
      "D": "眼神里没有光，只剩下工牌还活着"
    }
  },
  {
    "id": 84,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "同事之间是否内耗？",
    "options": {
      "A": "目标一致，配合顺",
      "B": "偶尔有摩擦",
      "C": "小群很多，互相防",
      "D": "表面一家人，背后截图举报"
    }
  },
  {
    "id": 85,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "公司是否喜欢搞站队？",
    "options": {
      "A": "基本没有",
      "B": "有些小圈子",
      "C": "跟对领导很重要",
      "D": "不站队都活不明白，像宫斗低配版"
    }
  },
  {
    "id": 86,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "员工离职率如何？",
    "options": {
      "A": "正常流动",
      "B": "个别岗位流动大",
      "C": "经常有人突然走",
      "D": "每周都有人消失，像公司在掉帧"
    }
  },
  {
    "id": 87,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "老板对员工情绪怎么看？",
    "options": {
      "A": "会关注压力来源",
      "B": "偶尔安抚",
      "C": "只说抗压能力不行",
      "D": "员工崩了，公司发邮件提醒大家注意身体"
    }
  },
  {
    "id": 88,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "团建是什么感受？",
    "options": {
      "A": "自愿、轻松、工作日",
      "B": "偶尔占用休息时间",
      "C": "周末强制参加",
      "D": "自费、表演、喊口号，纯纯精神折磨"
    }
  },
  {
    "id": 89,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "公司是否搞家文化？",
    "options": {
      "A": "团队互助，但边界清楚",
      "B": "偶尔用家人说法",
      "C": "用家文化要求奉献",
      "D": "公司是我家，工资晚发你要理解一下"
    }
  },
  {
    "id": 90,
    "category": "人和氛围",
    "dimension": "culture",
    "text": "员工意见会被听见吗？",
    "options": {
      "A": "会收集，也会改",
      "B": "有些能推动",
      "C": "听了没反应",
      "D": "你一提意见，领导开始记仇"
    }
  },
  {
    "id": 91,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板最大的问题像哪种？",
    "options": {
      "A": "经验有局限，但愿意听",
      "B": "有时太急",
      "C": "不懂装懂",
      "D": "完全不懂，还嫌专业的人想太多"
    }
  },
  {
    "id": 92,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板对细节的关注点是？",
    "options": {
      "A": "看关键风险和结果",
      "B": "偶尔抠细节",
      "C": "只抠PPT字体和颜色",
      "D": "字体改到凌晨，商业模式一句不问"
    }
  },
  {
    "id": 93,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板承诺兑现度如何？",
    "options": {
      "A": "说到基本做到",
      "B": "偶尔延迟",
      "C": "经常口头承诺",
      "D": "“下次一定”是公司最高纲领"
    }
  },
  {
    "id": 94,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板遇到坏消息怎么反应？",
    "options": {
      "A": "先看事实",
      "B": "会着急但能处理",
      "C": "先骂人",
      "D": "提坏消息的人被打成负能量"
    }
  },
  {
    "id": 95,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板是否尊重专业？",
    "options": {
      "A": "会听专业建议",
      "B": "听，但有时自己拍板",
      "C": "表面听，实际按感觉来",
      "D": "专业意见在老板灵感面前屁都不是"
    }
  },
  {
    "id": 96,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板最爱怎么激励人？",
    "options": {
      "A": "给目标也给资源",
      "B": "认可贡献",
      "C": "讲情怀和格局",
      "D": "你不能只看钱，但他自己一分钱不少拿"
    }
  },
  {
    "id": 97,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板是否经常越级指挥？",
    "options": {
      "A": "很少",
      "B": "偶尔直接沟通",
      "C": "经常绕过负责人",
      "D": "老板一句话，所有流程原地去世"
    }
  },
  {
    "id": 98,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板会不会甩锅？",
    "options": {
      "A": "基本承担决策责任",
      "B": "有时会解释",
      "C": "经常说执行有问题",
      "D": "当初是他拍板，出事变成“我只是建议”"
    }
  },
  {
    "id": 99,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板时间观念如何？",
    "options": {
      "A": "尊重下班和休息",
      "B": "紧急事会说明",
      "C": "经常晚上临时找人",
      "D": "周末凌晨发语音：“睡了吗？”"
    }
  },
  {
    "id": 100,
    "category": "老板与领导",
    "dimension": "decision",
    "text": "老板说话可信度如何？",
    "options": {
      "A": "信息准确，逻辑清楚",
      "B": "有些夸张",
      "C": "经常前后矛盾",
      "D": "听他说完，你只知道又要加班了"
    }
  },
  {
    "id": 101,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "绩效标准提前知道吗？",
    "options": {
      "A": "提前确认",
      "B": "大概知道",
      "C": "到考核时才知道重点",
      "D": "考完才发现规则刚刚刷新"
    }
  },
  {
    "id": 102,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "绩效沟通怎么进行？",
    "options": {
      "A": "有数据、有反馈",
      "B": "主管会解释",
      "C": "只给结果不解释",
      "D": "你问原因，对方说“大家都这样”"
    }
  },
  {
    "id": 103,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "绩效结果是否公平？",
    "options": {
      "A": "大体公平",
      "B": "有争议但能申诉",
      "C": "看领导印象",
      "D": "谁会来事谁高分，干活的人继续当牛马"
    }
  },
  {
    "id": 104,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "晋升路径清楚吗？",
    "options": {
      "A": "职级标准明确",
      "B": "有标准但执行一般",
      "C": "靠领导推荐",
      "D": "晋升靠拍马屁，不靠交付"
    }
  },
  {
    "id": 105,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "高潜人才怎么选？",
    "options": {
      "A": "看能力和潜力",
      "B": "看业绩和影响力",
      "C": "看领导喜好",
      "D": "老板喜欢谁，谁就是未来之星"
    }
  },
  {
    "id": 106,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "调薪和晋升关系如何？",
    "options": {
      "A": "匹配清楚",
      "B": "有时不同步",
      "C": "升职不涨薪",
      "D": "title给你升了，钱一分没动，还让你感恩"
    }
  },
  {
    "id": 107,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "公司如何处理优秀员工？",
    "options": {
      "A": "给资源和回报",
      "B": "让其带项目",
      "C": "能者多劳",
      "D": "你越能干，脏活越多，涨薪越慢"
    }
  },
  {
    "id": 108,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "对低绩效员工怎么处理？",
    "options": {
      "A": "反馈、辅导、改进",
      "B": "给时间观察",
      "C": "直接贴标签",
      "D": "平时不管，裁员时拿来当理由"
    }
  },
  {
    "id": 109,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "绩效是否会被临时改？",
    "options": {
      "A": "基本不会",
      "B": "偶尔调整口径",
      "C": "常被战略变化影响",
      "D": "目标是移动靶，员工是活靶子"
    }
  },
  {
    "id": 110,
    "category": "绩效与晋升",
    "dimension": "talent",
    "text": "晋升评审像什么？",
    "options": {
      "A": "材料、答辩、结果清楚",
      "B": "有流程但透明度一般",
      "C": "结果基本内定",
      "D": "大家陪跑交材料，领导亲信直接上岸"
    }
  },
  {
    "id": 111,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "公司现金流状态给你的感觉是？",
    "options": {
      "A": "稳定健康",
      "B": "偶尔紧张",
      "C": "经常压款",
      "D": "工资、报销、供应商全拖，靠“下轮融资”续命"
    }
  },
  {
    "id": 112,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "合同管理怎么样？",
    "options": {
      "A": "法务审核，归档清楚",
      "B": "重要合同会看",
      "C": "模板混乱",
      "D": "合同靠销售百度复制，法务像传说"
    }
  },
  {
    "id": 113,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "付款流程是否正规？",
    "options": {
      "A": "合同、发票、验收齐全",
      "B": "基本按流程",
      "C": "经常特批",
      "D": "老板一句“先打钱”，财务开始冒冷汗"
    }
  },
  {
    "id": 114,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "公司是否存在避税骚操作？",
    "options": {
      "A": "正规发薪缴税",
      "B": "有部分补贴单独发",
      "C": "工资拆两笔",
      "D": "让你配合“税务优化”，听着就不干净"
    }
  },
  {
    "id": 115,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "发票和报销要求如何？",
    "options": {
      "A": "清楚规范",
      "B": "偶尔补材料",
      "C": "规则经常变",
      "D": "发票要得比命细，报销慢得像修仙"
    }
  },
  {
    "id": 116,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "公司对法律风险态度怎样？",
    "options": {
      "A": "谨慎合规",
      "B": "有风险会评估",
      "C": "先做了再补",
      "D": "“别那么较真”是法务最高指导思想"
    }
  },
  {
    "id": 117,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "印章管理如何？",
    "options": {
      "A": "流程严格，留痕完整",
      "B": "需要审批",
      "C": "偶尔临时借章",
      "D": "谁拿到章谁是王，盖完再说"
    }
  },
  {
    "id": 118,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "数据和隐私管理怎样？",
    "options": {
      "A": "权限分级，安全合规",
      "B": "有基础权限",
      "C": "资料随便传",
      "D": "客户数据在群里裸奔，还没人觉得有问题"
    }
  },
  {
    "id": 119,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "供应商合作是否透明？",
    "options": {
      "A": "比价和审批完整",
      "B": "基本合理",
      "C": "有关系户",
      "D": "老板亲戚报价最高但必须选"
    }
  },
  {
    "id": 120,
    "category": "财务与合规",
    "dimension": "risk",
    "text": "公司最怕员工问什么？",
    "options": {
      "A": "业务目标",
      "B": "岗位发展",
      "C": "离职率和现金流",
      "D": "一问这些，空气都凝固了"
    }
  },
  {
    "id": 121,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "入职账号开通速度如何？",
    "options": {
      "A": "当天全部开好",
      "B": "缺几个权限",
      "C": "一周还在补",
      "D": "入职半个月还用同事账号凑合"
    }
  },
  {
    "id": 122,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "公司文档管理怎样？",
    "options": {
      "A": "统一平台，分类清楚",
      "B": "能找到大部分资料",
      "C": "到处散落",
      "D": "文档像考古，找资料像盗墓"
    }
  },
  {
    "id": 123,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "任务管理工具有用吗？",
    "options": {
      "A": "进度清晰",
      "B": "有人维护",
      "C": "只是摆设",
      "D": "工具里没人更新，最后还是靠老板吼"
    }
  },
  {
    "id": 124,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "数据看板真实吗？",
    "options": {
      "A": "实时、准确、可追溯",
      "B": "有延迟但可用",
      "C": "经常对不上",
      "D": "看板是给老板看的，实际干活没人用"
    }
  },
  {
    "id": 125,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "系统权限怎么管？",
    "options": {
      "A": "按岗位分配",
      "B": "申请审批",
      "C": "权限乱给",
      "D": "离职员工账号还在，密码还全员知道"
    }
  },
  {
    "id": 126,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "公司IT支持体验如何？",
    "options": {
      "A": "工单响应快",
      "B": "能解决但慢",
      "C": "找不到负责人",
      "D": "电脑坏了让你自己淘宝买配件"
    }
  },
  {
    "id": 127,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "内部工具是否重复填写？",
    "options": {
      "A": "信息自动同步",
      "B": "偶尔重复",
      "C": "多个平台填同样内容",
      "D": "为了提效上了十个系统，效率直接去世"
    }
  },
  {
    "id": 128,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "密码和账号安全如何？",
    "options": {
      "A": "有规范和双重验证",
      "B": "基础安全还行",
      "C": "密码经常共享",
      "D": "生产密码写群公告，离谱得像段子"
    }
  },
  {
    "id": 129,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "线上故障怎么响应？",
    "options": {
      "A": "有预案和值班",
      "B": "临时拉人处理",
      "C": "靠喊人救火",
      "D": "系统挂了才想起来没人会回滚"
    }
  },
  {
    "id": 130,
    "category": "工具与系统",
    "dimension": "quality",
    "text": "公司是否沉淀知识？",
    "options": {
      "A": "有知识库",
      "B": "有些文档",
      "C": "主要靠问老人",
      "D": "老员工一走，系统像失忆了一样"
    }
  },
  {
    "id": 131,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "公司墙上的价值观真实吗？",
    "options": {
      "A": "和日常行为基本一致",
      "B": "部分能做到",
      "C": "口号多于行动",
      "D": "墙上诚信担当，实际拖欠工资"
    }
  },
  {
    "id": 132,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "公司最爱喊什么口号？",
    "options": {
      "A": "服务客户，做好产品",
      "B": "团结协作，共同成长",
      "C": "狼性、突破、all in",
      "D": "不喊还好，一喊就知道又要白干"
    }
  },
  {
    "id": 133,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "狼性文化在你们公司表现为？",
    "options": {
      "A": "目标感强",
      "B": "执行比较快",
      "C": "内卷严重",
      "D": "白天打鸡血，晚上互相咬"
    }
  },
  {
    "id": 134,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "主人翁精神怎么被使用？",
    "options": {
      "A": "鼓励主动解决问题",
      "B": "给空间也给回报",
      "C": "要求员工多承担",
      "D": "像老板一样负责，像外包一样拿钱"
    }
  },
  {
    "id": 135,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "公司是否尊重个人边界？",
    "options": {
      "A": "基本尊重",
      "B": "偶尔打扰休息",
      "C": "经常下班联系",
      "D": "休息时间属于公司，工资时间属于老板"
    }
  },
  {
    "id": 136,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "文化活动体验如何？",
    "options": {
      "A": "放松、有趣、自愿",
      "B": "偶尔形式化",
      "C": "强制参加",
      "D": "下班排练节目，不去说你没集体荣誉感"
    }
  },
  {
    "id": 137,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "公司是否喜欢表演式奋斗？",
    "options": {
      "A": "不看坐班时长",
      "B": "偶尔看状态",
      "C": "晚走的人更吃香",
      "D": "谁先下班谁像叛徒"
    }
  },
  {
    "id": 138,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "老板对“年轻人吃苦”的理解是？",
    "options": {
      "A": "成长需要挑战",
      "B": "阶段性辛苦",
      "C": "多干活少抱怨",
      "D": "年轻人不吃苦，难道让老板少买车吗"
    }
  },
  {
    "id": 139,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "公司如何定义忠诚？",
    "options": {
      "A": "长期贡献和信任",
      "B": "稳定投入",
      "C": "不离职不抱怨",
      "D": "工资晚发还不吭声才叫忠诚"
    }
  },
  {
    "id": 140,
    "category": "文化与价值观",
    "dimension": "culture",
    "text": "公司是否允许正常吐槽？",
    "options": {
      "A": "可以理性反馈",
      "B": "私下说说没事",
      "C": "被认为态度不好",
      "D": "一吐槽就有人截图递刀"
    }
  },
  {
    "id": 141,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "销售签单前会不会确认交付能力？",
    "options": {
      "A": "会评估范围和资源",
      "B": "大致确认",
      "C": "为了签单先答应",
      "D": "销售嘴一张，交付火葬场"
    }
  },
  {
    "id": 142,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "客户项目范围清楚吗？",
    "options": {
      "A": "合同写得清楚",
      "B": "大体明确",
      "C": "经常变更",
      "D": "客户说加就加，公司说忍一忍"
    }
  },
  {
    "id": 143,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "交付团队和销售关系如何？",
    "options": {
      "A": "协同顺畅",
      "B": "有摩擦但能沟通",
      "C": "互相埋怨",
      "D": "销售台前吹牛，交付后台擦屁股"
    }
  },
  {
    "id": 144,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "客户验收标准怎样？",
    "options": {
      "A": "事前明确",
      "B": "项目中补充",
      "C": "主要看客户心情",
      "D": "客户一句不满意，内部全员懵逼"
    }
  },
  {
    "id": 145,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "客户投诉后公司反应是？",
    "options": {
      "A": "查问题、给方案",
      "B": "先安抚客户",
      "C": "先找责任人",
      "D": "客户还没骂完，内部先开始甩锅"
    }
  },
  {
    "id": 146,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "销售承诺是否有记录？",
    "options": {
      "A": "进合同或纪要",
      "B": "微信留痕",
      "C": "口头很多",
      "D": "销售说“我没这么说过”，交付直接裂开"
    }
  },
  {
    "id": 147,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "客户需求插队常见吗？",
    "options": {
      "A": "有优先级管理",
      "B": "大客户会优先",
      "C": "经常临时加塞",
      "D": "谁在群里吼得凶，谁需求先做"
    }
  },
  {
    "id": 148,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "售前方案质量如何？",
    "options": {
      "A": "基于真实能力",
      "B": "稍微包装",
      "C": "过度承诺",
      "D": "PPT里什么都有，产品里什么都没有"
    }
  },
  {
    "id": 149,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "项目延期怎么跟客户说？",
    "options": {
      "A": "提前沟通风险",
      "B": "找理由解释",
      "C": "临近截止才说",
      "D": "内部没人敢说，最后客户自己发现"
    }
  },
  {
    "id": 150,
    "category": "客户、销售与交付",
    "dimension": "customer",
    "text": "交付完成后是否复盘？",
    "options": {
      "A": "复盘客户体验和利润",
      "B": "简单总结",
      "C": "做完就算",
      "D": "只要客户没骂上门，就当项目成功"
    }
  },
  {
    "id": 151,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "办公环境像什么？",
    "options": {
      "A": "正常、安静、设施齐",
      "B": "有点挤但能工作",
      "C": "工位不够，经常蹭位置",
      "D": "人来了，桌子没有，电脑没有，椅子还坏"
    }
  },
  {
    "id": 152,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "会议室使用体验如何？",
    "options": {
      "A": "可预约，有秩序",
      "B": "偶尔抢不到",
      "C": "经常被领导临时占",
      "D": "会议室靠抢，谁脸皮厚谁赢"
    }
  },
  {
    "id": 153,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "办公网络稳定吗？",
    "options": {
      "A": "稳定",
      "B": "偶尔卡",
      "C": "经常断",
      "D": "公司喊数字化转型，Wi-Fi先转不动"
    }
  },
  {
    "id": 154,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "公司设备配置如何？",
    "options": {
      "A": "能满足工作",
      "B": "勉强够用",
      "C": "卡得影响效率",
      "D": "电脑开个表格像要起飞，风扇比你还努力"
    }
  },
  {
    "id": 155,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "办公用品怎么申请？",
    "options": {
      "A": "正常申请",
      "B": "有点慢",
      "C": "要层层审批",
      "D": "申请个鼠标像走IPO流程"
    }
  },
  {
    "id": 156,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "午休和休息状态怎样？",
    "options": {
      "A": "有基本休息空间",
      "B": "大家自己安排",
      "C": "经常被打断",
      "D": "刚放下筷子，群里又@你"
    }
  },
  {
    "id": 157,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "公司是否有安全意识？",
    "options": {
      "A": "消防、门禁都规范",
      "B": "基本还行",
      "C": "有些隐患没人管",
      "D": "消防通道堆满杂物，还说别太较真"
    }
  },
  {
    "id": 158,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "办公地点是否稳定？",
    "options": {
      "A": "稳定办公",
      "B": "偶尔搬迁",
      "C": "经常说要搬",
      "D": "面试在咖啡厅，入职说办公室还在找"
    }
  },
  {
    "id": 159,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "行政支持如何？",
    "options": {
      "A": "响应及时",
      "B": "能解决但慢",
      "C": "经常找不到人",
      "D": "行政像隐藏NPC，只有特定时间刷新"
    }
  },
  {
    "id": 160,
    "category": "办公与日常",
    "dimension": "organization",
    "text": "公司日常氛围像什么？",
    "options": {
      "A": "忙但有秩序",
      "B": "有点混乱",
      "C": "天天救火",
      "D": "每天都像临时搭的台，演员还没剧本"
    }
  },
  {
    "id": 161,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "公司经营困难时怎么沟通？",
    "options": {
      "A": "透明说明，给方案",
      "B": "只讲大概",
      "C": "释放模糊信号",
      "D": "员工靠厕所聊天判断公司是不是快没了"
    }
  },
  {
    "id": 162,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "裁员流程是否正规？",
    "options": {
      "A": "合规沟通和补偿",
      "B": "基本按流程",
      "C": "变相逼退",
      "D": "不说裁员，说“组织优化、双向选择”"
    }
  },
  {
    "id": 163,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "降薪沟通方式如何？",
    "options": {
      "A": "协商并书面确认",
      "B": "解释原因再谈",
      "C": "单方面通知",
      "D": "下月工资直接打折，还说不同意可以走"
    }
  },
  {
    "id": 164,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "公司如何处理危机项目？",
    "options": {
      "A": "建立应急机制",
      "B": "拉专项组处理",
      "C": "全员救火",
      "D": "平时没人管，爆了通宵干，完了继续没人管"
    }
  },
  {
    "id": 165,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "融资消息可靠吗？",
    "options": {
      "A": "信息透明",
      "B": "有进展但不确定",
      "C": "总说快了",
      "D": "下轮融资永远在路上，工资永远在等等"
    }
  },
  {
    "id": 166,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "老板面对资金压力说什么？",
    "options": {
      "A": "控成本，保现金流",
      "B": "大家共克时艰",
      "C": "先忍一忍",
      "D": "公司困难是员工的，成功是老板的"
    }
  },
  {
    "id": 167,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "公司会不会突然砍项目？",
    "options": {
      "A": "有评估后调整",
      "B": "会提前通知",
      "C": "经常突然停",
      "D": "昨天All in，今天解散群"
    }
  },
  {
    "id": 168,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "离职潮出现时公司怎么做？",
    "options": {
      "A": "分析原因，改问题",
      "B": "做挽留沟通",
      "C": "对外说正常优化",
      "D": "人走一片，公司还说团队更精干了"
    }
  },
  {
    "id": 169,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "供应商追款时公司状态？",
    "options": {
      "A": "正常结算",
      "B": "偶尔延期",
      "C": "财务拖着",
      "D": "供应商堵门，内部还在讲长期合作"
    }
  },
  {
    "id": 170,
    "category": "裁员与危机",
    "dimension": "risk",
    "text": "危机后有没有改进？",
    "options": {
      "A": "有机制调整",
      "B": "有部分优化",
      "C": "只写复盘文档",
      "D": "改进停留在“大家以后注意”"
    }
  },
  {
    "id": 171,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“自驱”时通常意味着？",
    "options": {
      "A": "主动推进工作",
      "B": "少一点管理也能做事",
      "C": "不给资源也要自己想办法",
      "D": "公司啥都没有，靠你自己发电"
    }
  },
  {
    "id": 172,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“皮实”时通常意味着？",
    "options": {
      "A": "能承受复杂项目",
      "B": "抗压能力不错",
      "C": "被骂也别玻璃心",
      "D": "能被折腾还不跑路"
    }
  },
  {
    "id": 173,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“快速成长”时通常意味着？",
    "options": {
      "A": "学习机会多",
      "B": "项目挑战大",
      "C": "没人带，全靠踩坑",
      "D": "坑都是你的，成长是公司的"
    }
  },
  {
    "id": 174,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“结果导向”时通常意味着？",
    "options": {
      "A": "不搞形式主义",
      "B": "关注交付质量",
      "C": "过程资源没人管",
      "D": "没钱没人没权限，最后结果不好怪你"
    }
  },
  {
    "id": 175,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“向上管理”时通常意味着？",
    "options": {
      "A": "主动同步信息",
      "B": "帮领导理解风险",
      "C": "让你替领导想办法",
      "D": "领导不负责，还要你管理他的情绪"
    }
  },
  {
    "id": 176,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“闭环”时通常意味着？",
    "options": {
      "A": "事情有始有终",
      "B": "责任和结果清楚",
      "C": "群里回复“收到”",
      "D": "嘴上闭环，现实烂尾"
    }
  },
  {
    "id": 177,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“抓手”时通常意味着？",
    "options": {
      "A": "具体动作",
      "B": "实施路径",
      "C": "还没想清楚",
      "D": "没抓手也要硬抓，抓到谁是谁"
    }
  },
  {
    "id": 178,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“赋能”时通常意味着？",
    "options": {
      "A": "提供资源和能力",
      "B": "分享经验",
      "C": "开会培训",
      "D": "领导讲PPT，基层继续懵"
    }
  },
  {
    "id": 179,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“共创”时通常意味着？",
    "options": {
      "A": "一起制定方案",
      "B": "多方参与讨论",
      "C": "基层出主意",
      "D": "你贡献脑子，领导贡献署名"
    }
  },
  {
    "id": 180,
    "category": "黑话与PUA",
    "dimension": "culture",
    "text": "听到“格局”时通常意味着？",
    "options": {
      "A": "站高一点看问题",
      "B": "考虑整体利益",
      "C": "别计较个人得失",
      "D": "让你闭嘴、少要钱、多干活"
    }
  },
  {
    "id": 181,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司承诺的事情通常会怎样？",
    "options": {
      "A": "按时兑现",
      "B": "偶尔延期",
      "C": "需要你反复催",
      "D": "不催没有，催了也没有"
    }
  },
  {
    "id": 182,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司对时间的尊重如何？",
    "options": {
      "A": "会议准时，排期合理",
      "B": "偶尔拖延",
      "C": "经常临时变动",
      "D": "别人的时间不算时间，只有老板的灵感算时间"
    }
  },
  {
    "id": 183,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "你在公司最常见的工作状态是？",
    "options": {
      "A": "有计划地推进",
      "B": "偶尔救火",
      "C": "经常救火",
      "D": "一天不救火，公司像活不过今晚"
    }
  },
  {
    "id": 184,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司最常见的借口是？",
    "options": {
      "A": "资源有限",
      "B": "时间紧",
      "C": "战略变化",
      "D": "反正最后都是“大家辛苦一下”"
    }
  },
  {
    "id": 185,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司是否尊重事实？",
    "options": {
      "A": "看数据和证据",
      "B": "有时受主观影响",
      "C": "领导感觉更重要",
      "D": "事实不重要，老板爽不爽重要"
    }
  },
  {
    "id": 186,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "你是否经常觉得信息不对称？",
    "options": {
      "A": "重要信息能同步",
      "B": "有些消息滞后",
      "C": "经常靠打听",
      "D": "公司重大变化，员工最后一个知道"
    }
  },
  {
    "id": 187,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司是否有基本计划性？",
    "options": {
      "A": "月度季度计划清楚",
      "B": "有计划但常调整",
      "C": "经常临时拍",
      "D": "公司计划像天气预报，还没天气预报准"
    }
  },
  {
    "id": 188,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "工作中最常见的锅来自哪里？",
    "options": {
      "A": "自己负责范围内的问题",
      "B": "跨部门协作问题",
      "C": "上游没说清",
      "D": "领导拍脑袋，基层背大锅"
    }
  },
  {
    "id": 189,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司有没有反复造轮子？",
    "options": {
      "A": "会复用已有东西",
      "B": "偶尔重复建设",
      "C": "部门之间各做一套",
      "D": "同一个表、同一个系统、同一个方案反复重做"
    }
  },
  {
    "id": 190,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司是否重视沉淀？",
    "options": {
      "A": "项目后会归档",
      "B": "关键资料会留",
      "C": "忙起来没人管",
      "D": "人走了，经验也火化了"
    }
  },
  {
    "id": 191,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "你是否经常被临时拉去干无关工作？",
    "options": {
      "A": "基本不会",
      "B": "偶尔支援",
      "C": "经常补位",
      "D": "岗位写运营，实际行政、客服、销售、剪辑全包"
    }
  },
  {
    "id": 192,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司是否有边界感？",
    "options": {
      "A": "岗位和时间边界清楚",
      "B": "偶尔模糊",
      "C": "经常模糊",
      "D": "你的边界就是公司需要你到哪里为止"
    }
  },
  {
    "id": 193,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "你是否感觉公司靠少数人硬撑？",
    "options": {
      "A": "团队分工均衡",
      "B": "有核心骨干",
      "C": "几个人扛大部分活",
      "D": "公司不是系统，是几个牛马用命顶着"
    }
  },
  {
    "id": 194,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "公司是否有“表面繁荣”？",
    "options": {
      "A": "业务和内部都健康",
      "B": "对外包装略好",
      "C": "外面看着热闹，里面一地鸡毛",
      "D": "官网像上市公司，内部像出租屋创业队"
    }
  },
  {
    "id": 195,
    "category": "判断草台程度的细节",
    "dimension": "quality",
    "text": "你对公司未来的真实感觉是？",
    "options": {
      "A": "有信心",
      "B": "谨慎乐观",
      "C": "不太确定",
      "D": "感觉每天都在赌公司别突然爆雷"
    }
  },
  {
    "id": 196,
    "category": "最终体感",
    "dimension": "culture",
    "text": "你每天上班前的心情更像？",
    "options": {
      "A": "正常工作状态",
      "B": "有点烦但能接受",
      "C": "一想到公司就累",
      "D": "闹钟一响，灵魂先骂一句脏话"
    }
  },
  {
    "id": 197,
    "category": "最终体感",
    "dimension": "culture",
    "text": "你和朋友聊公司时通常怎么说？",
    "options": {
      "A": "还不错，有成长",
      "B": "有些问题但能忍",
      "C": "太乱了，先混着",
      "D": "这公司能活到今天，纯靠玄学"
    }
  },
  {
    "id": 198,
    "category": "最终体感",
    "dimension": "culture",
    "text": "你判断公司最核心的问题是？",
    "options": {
      "A": "阶段性不完善",
      "B": "管理能力一般",
      "C": "流程、目标、人都乱",
      "D": "不是哪里有问题，是哪里都他妈有问题"
    }
  },
  {
    "id": 199,
    "category": "最终体感",
    "dimension": "culture",
    "text": "如果新人问你要不要来，你会怎么说？",
    "options": {
      "A": "可以考虑",
      "B": "看岗位和领导",
      "C": "慎重，坑不少",
      "D": "快跑，别回头，鞋掉了都别捡"
    }
  },
  {
    "id": 200,
    "category": "最终体感",
    "dimension": "culture",
    "text": "你给这家公司一句话评价是？",
    "options": {
      "A": "还算正规，有提升空间",
      "B": "成长期公司，问题不少",
      "C": "草台味明显，靠人硬撑",
      "D": "草台班子plus版，PPT治国，黑话续命，社畜献祭"
    }
  },
  {
    "id": 201,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司说要“All in AI”时，实际状态更像哪种？",
    "options": {
      "A": "有明确业务场景、预算和负责人",
      "B": "先做小范围试点，再看效果",
      "C": "老板开会喊了一句，下面开始乱找工具",
      "D": "全员懵逼，但PPT已经写成“AI战略元年”"
    }
  },
  {
    "id": 202,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司引入 AI 的第一步是什么？",
    "options": {
      "A": "梳理业务流程，找高频低效环节",
      "B": "选几个岗位试用，提高效率",
      "C": "让员工自己研究，月底汇报成果",
      "D": "直接让所有人“用AI提效30%”，不管怎么用"
    }
  },
  {
    "id": 203,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "老板对 AI 的理解更接近哪种？",
    "options": {
      "A": "AI是工具，不是万能药",
      "B": "AI能提升部分岗位效率",
      "C": "AI可以替代一部分重复劳动",
      "D": "AI马上替代所有人，所以先裁一半试试"
    }
  },
  {
    "id": 204,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否有 AI 使用规范？",
    "options": {
      "A": "有清楚的数据、隐私、版权规则",
      "B": "有简单规范，边用边完善",
      "C": "只说“注意保密”，没有细则",
      "D": "客户资料、合同、代码全往免费AI里丢，突出一个命硬"
    }
  },
  {
    "id": 205,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司让你用 AI 写方案时，要求是什么？",
    "options": {
      "A": "AI辅助，人来判断和修改",
      "B": "先生成初稿，再人工优化",
      "C": "越快越好，质量后面再说",
      "D": "直接复制粘贴，错了再让员工背锅"
    }
  },
  {
    "id": 206,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 AI 项目时，最像哪种？",
    "options": {
      "A": "有需求、有数据、有验收标准",
      "B": "先做Demo验证可行性",
      "C": "先买工具，再想场景",
      "D": "先发布新闻稿，再找研发看能不能做"
    }
  },
  {
    "id": 207,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "老板看到 ChatGPT 后的反应是？",
    "options": {
      "A": "研究适合哪些业务环节",
      "B": "让团队试点提效",
      "C": "要每个部门都交AI方案",
      "D": "说“这个不就是几句话的事吗”，然后砍预算砍人"
    }
  },
  {
    "id": 208,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对 AI 生成内容的态度是？",
    "options": {
      "A": "必须人工审核",
      "B": "重要内容重点检查",
      "C": "默认能用就行",
      "D": "生成啥发啥，出事说“是AI写的”"
    }
  },
  {
    "id": 209,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 AI 客服时，体验更像？",
    "options": {
      "A": "能解决常见问题，复杂问题转人工",
      "B": "能覆盖一部分咨询",
      "C": "经常答非所问",
      "D": "用户快气死了，机器人还在“亲亲建议您重试”"
    }
  },
  {
    "id": 210,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 AI 产品时，最大问题是？",
    "options": {
      "A": "场景还在验证",
      "B": "数据质量一般",
      "C": "产品价值不清楚",
      "D": "除了接个大模型接口，啥壁垒没有，还敢说自研"
    }
  },
  {
    "id": 211,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司宣传“自研大模型”时，真实情况是？",
    "options": {
      "A": "确实有训练、评测和工程团队",
      "B": "基于开源模型做了深度适配",
      "C": "调了个API，包装成自研",
      "D": "套壳都套不明白，还敢吹国产领先"
    }
  },
  {
    "id": 212,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司内部用 AI 最常见的问题是？",
    "options": {
      "A": "有些人用得好，有些人还在学习",
      "B": "工具分散，需要统一",
      "C": "输出质量不稳定",
      "D": "大家都在用AI写废话，工作量一点没少"
    }
  },
  {
    "id": 213,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司给员工做 AI 培训时，内容像什么？",
    "options": {
      "A": "结合岗位讲实际场景",
      "B": "讲工具和案例",
      "C": "教大家写万能提示词",
      "D": "领导念PPT：AI时代，不学习就淘汰"
    }
  },
  {
    "id": 214,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否评估 AI 成本？",
    "options": {
      "A": "会算token、调用量、ROI",
      "B": "大概知道费用结构",
      "C": "用爆了才发现很贵",
      "D": "老板以为AI不要钱，账单来了说技术乱花钱"
    }
  },
  {
    "id": 215,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司说“AI降本增效”时，通常意味着？",
    "options": {
      "A": "优化重复流程",
      "B": "减少低价值工作",
      "C": "让员工一个人干两个人的活",
      "D": "裁人、压预算、加KPI，然后说这是技术红利"
    }
  },
  {
    "id": 216,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对 AI 幻觉问题怎么看？",
    "options": {
      "A": "有校验机制和人工复核",
      "B": "重要场景会控制风险",
      "C": "知道有问题但没细管",
      "D": "AI胡说八道，老板说“你们不会调教”"
    }
  },
  {
    "id": 217,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "AI 需求评审时最常见的画风是？",
    "options": {
      "A": "明确输入、输出、用户场景",
      "B": "讨论模型能力和边界",
      "C": "先做个Demo看看",
      "D": "老板说“我要一个像贾维斯一样的东西”"
    }
  },
  {
    "id": 218,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 AI Agent 时，更像哪种？",
    "options": {
      "A": "有清楚任务流和工具调用边界",
      "B": "先做单一场景自动化",
      "C": "做了个聊天窗口就叫Agent",
      "D": "连流程都没梳理，先喊智能体矩阵"
    }
  },
  {
    "id": 219,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 RAG 或知识库时，状态如何？",
    "options": {
      "A": "文档清洗、权限、检索都认真做",
      "B": "先接入核心资料",
      "C": "文档一股脑扔进去",
      "D": "知识库答不出来，老板怪模型不够聪明"
    }
  },
  {
    "id": 220,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司让 AI 参与代码开发时，规则是？",
    "options": {
      "A": "AI辅助编码，代码必须review",
      "B": "允许用工具提高效率",
      "C": "看个人习惯",
      "D": "AI写完直接上线，出了bug全员修罗场"
    }
  },
  {
    "id": 221,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司采购 AI 工具时，依据是什么？",
    "options": {
      "A": "安全、成本、效果、适配度",
      "B": "试用后再决定",
      "C": "谁家宣传猛买谁",
      "D": "老板饭局听人推荐，第二天全公司强推"
    }
  },
  {
    "id": 222,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否区分公有模型和私有部署？",
    "options": {
      "A": "根据数据敏感度选择",
      "B": "大概知道区别",
      "C": "只知道私有化听起来高级",
      "D": "客户问安全，公司回答“我们用的是AI，很智能”"
    }
  },
  {
    "id": 223,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 AI 相关汇报时，最常见内容是？",
    "options": {
      "A": "业务效果、成本、风险",
      "B": "试点数据和后续计划",
      "C": "一堆截图和案例",
      "D": "“赋能千行百业，重构生产力”，但没有一个真实用户"
    }
  },
  {
    "id": 224,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对提示词工程的理解是？",
    "options": {
      "A": "是辅助方法，不是全部",
      "B": "有些场景确实有用",
      "C": "让员工背提示词模板",
      "D": "以为会写prompt就能替代产品、运营、研发、设计"
    }
  },
  {
    "id": 225,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 AI 营销内容时，质量如何？",
    "options": {
      "A": "AI出初稿，人来把控品牌调性",
      "B": "速度提高了，质量还行",
      "C": "内容有点同质化",
      "D": "一眼AI味，标题还写“震惊！未来已来！”"
    }
  },
  {
    "id": 226,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否关注 AI 版权风险？",
    "options": {
      "A": "有素材和输出审核机制",
      "B": "重要内容会检查来源",
      "C": "偶尔提醒别乱用",
      "D": "图片、文案、音乐随便生成，商业使用全靠胆子大"
    }
  },
  {
    "id": 227,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司 AI 项目的验收标准是什么？",
    "options": {
      "A": "准确率、效率、成本、用户满意度",
      "B": "看Demo效果",
      "C": "看领导觉得酷不酷",
      "D": "只要能在大会上演示，就算阶段性胜利"
    }
  },
  {
    "id": 228,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对“AI替代岗位”的态度是？",
    "options": {
      "A": "先评估流程，再调整岗位能力",
      "B": "部分岗位会转型",
      "C": "管理层天天制造焦虑",
      "D": "还没工具就先吓员工：不会AI就滚"
    }
  },
  {
    "id": 229,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "AI 工具出错时，公司怎么处理？",
    "options": {
      "A": "分析原因，修正规则",
      "B": "人工兜底",
      "C": "临时补救",
      "D": "领导说“你为什么不让AI生成正确的？”"
    }
  },
  {
    "id": 230,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司 AI 战略最草台的信号是？",
    "options": {
      "A": "从小场景开始验证",
      "B": "先解决内部效率问题",
      "C": "先做宣传口径",
      "D": "产品没做出来，官网已经写“AI原生企业”"
    }
  },
  {
    "id": 231,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司内部是否有人真正懂 AI？",
    "options": {
      "A": "有技术和业务都懂的人",
      "B": "有几个愿意研究的人",
      "C": "大家都半懂不懂",
      "D": "最懂AI的人是市场部，因为他们最会吹"
    }
  },
  {
    "id": 232,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 AI 数据标注时，状态是？",
    "options": {
      "A": "标准清楚，有质检",
      "B": "有规则，但还在优化",
      "C": "标得比较粗糙",
      "D": "让实习生瞎标，最后怪模型效果差"
    }
  },
  {
    "id": 233,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对模型评测怎么看？",
    "options": {
      "A": "有测试集和指标",
      "B": "会做基本对比",
      "C": "主要靠人工试几条",
      "D": "老板问三句话都答对，就宣布可商用"
    }
  },
  {
    "id": 234,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司做 AI 私有化部署时，最像哪种？",
    "options": {
      "A": "根据安全和成本认真评估",
      "B": "先做POC",
      "C": "客户要私有化就硬接",
      "D": "技术还没搞清楚，销售已经把私有化卖出去了"
    }
  },
  {
    "id": 235,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对开源模型的态度是？",
    "options": {
      "A": "尊重协议，评估能力",
      "B": "会基于开源做适配",
      "C": "下载下来就说自研",
      "D": "README都没看，发布会先开"
    }
  },
  {
    "id": 236,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否有 AI 伦理或内容安全意识？",
    "options": {
      "A": "有敏感内容、偏见、合规机制",
      "B": "基础场景会处理",
      "C": "只在客户问时才提",
      "D": "只要能卖钱，安全以后再说"
    }
  },
  {
    "id": 237,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司用 AI 做数据分析时，体验如何？",
    "options": {
      "A": "AI辅助分析，人判断结论",
      "B": "能提高部分效率",
      "C": "经常生成看似合理的废话",
      "D": "AI编了个结论，老板拿去开会骂业务"
    }
  },
  {
    "id": 238,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司要求“人人都是AI产品经理”时，实际是？",
    "options": {
      "A": "鼓励跨岗位理解AI",
      "B": "让大家学习新工具",
      "C": "没有培训也没有方法",
      "D": "谁都能提AI需求，最后研发被许愿池淹死"
    }
  },
  {
    "id": 239,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否把 AI 当噱头包装传统业务？",
    "options": {
      "A": "AI确实提升核心体验",
      "B": "有部分AI能力",
      "C": "传统功能加个聊天框",
      "D": "Excel导入导出套个AI壳，就敢叫智能决策平台"
    }
  },
  {
    "id": 240,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "AI 项目延期时，原因通常是？",
    "options": {
      "A": "技术难度评估不足",
      "B": "数据和工程问题复杂",
      "C": "需求反复变化",
      "D": "一开始就没人知道自己在做什么"
    }
  },
  {
    "id": 241,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对 AI 生成图片/视频的使用方式是？",
    "options": {
      "A": "有版权、风格和审核流程",
      "B": "内部提案先用",
      "C": "商用前偶尔检查",
      "D": "客户大项目也直接拿生成图冲，水印都没擦干净"
    }
  },
  {
    "id": 242,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否区分“Demo”和“产品”？",
    "options": {
      "A": "区分很清楚",
      "B": "Demo后会补工程化",
      "C": "经常拿Demo当产品卖",
      "D": "演示能跑一次，就敢签全年合同"
    }
  },
  {
    "id": 243,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对 AI 工作流自动化的理解是？",
    "options": {
      "A": "先梳理流程，再自动化",
      "B": "选部分环节试点",
      "C": "直接买工具套流程",
      "D": "流程本来就乱，还想让AI自动救公司狗命"
    }
  },
  {
    "id": 244,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司有没有 AI 负责人？",
    "options": {
      "A": "有明确负责人和团队",
      "B": "有临时项目owner",
      "C": "几个部门都在抢",
      "D": "谁会写PPT谁就是AI负责人"
    }
  },
  {
    "id": 245,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否把 AI 当万能背锅侠？",
    "options": {
      "A": "不会，问题归因清楚",
      "B": "偶尔夸大AI能力",
      "C": "出错时推给工具",
      "D": "内容错了怪AI，项目黄了怪AI，预算超了也怪AI"
    }
  },
  {
    "id": 246,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司 AI 项目和真实业务结合程度如何？",
    "options": {
      "A": "解决具体痛点",
      "B": "有几个试点场景",
      "C": "更多是展示用途",
      "D": "业务没用上，但老板朋友圈已经发了九宫格"
    }
  },
  {
    "id": 247,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司对 AI 人才的招聘要求像什么？",
    "options": {
      "A": "技术栈和业务方向匹配",
      "B": "要求偏高但合理",
      "C": "希望一个人搞定算法、前端、后端、产品",
      "D": "月薪一万招“AI首席科学家”，还要会剪视频"
    }
  },
  {
    "id": 248,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司是否有模型调用监控？",
    "options": {
      "A": "有日志、成本、效果监控",
      "B": "有基础统计",
      "C": "只看月账单",
      "D": "被刷爆额度才发现API Key泄露"
    }
  },
  {
    "id": 249,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "公司宣传 AI 成果时，真实用户情况是？",
    "options": {
      "A": "有客户使用和反馈",
      "B": "有试点客户",
      "C": "主要是内部演示",
      "D": "没用户，但已经写进“行业标杆案例”"
    }
  },
  {
    "id": 250,
    "category": "AI 草台专项",
    "dimension": "quality",
    "text": "你对公司 AI 化的总体感觉是？",
    "options": {
      "A": "方向清楚，稳步推进",
      "B": "有尝试，但还不成熟",
      "C": "风口焦虑很重，落地一般",
      "D": "AI只是新一层遮羞布，里面还是那个草台班子"
    }
  }
] satisfies RawQuestion[];

const optionOrder: OptionId[] = ["A", "B", "C", "D"];

const optionScores = {
  A: 2.1,
  B: 0.7,
  C: -0.9,
  D: -2.1,
} satisfies Record<OptionId, number>;

function countCharacters(value: string) {
  return Array.from(value).length;
}

function emptyWeights(): Record<DimensionId, number> {
  return dimensions.reduce(
    (weights, dimension) => ({ ...weights, [dimension.id]: 0 }),
    {} as Record<DimensionId, number>,
  );
}

function makeWeights(primary: DimensionId, score: number) {
  const weights = emptyWeights();
  weights[primary] = score;
  return weights;
}

export const questionBank: Question[] = rawQuestions.map((raw) => {
  const questionWeights = emptyWeights();
  questionWeights[raw.dimension] = 1;

  return {
    id: `q-${String(raw.id).padStart(3, "0")}`,
    category: raw.category,
    text: raw.text,
    attribute: `${raw.dimension}:q-${String(raw.id).padStart(3, "0")}`,
    weights: questionWeights,
    options: optionOrder.map((optionId) => {
      const score = optionScores[optionId];

      return {
        id: optionId,
        label: raw.options[optionId],
        attribute: `${raw.dimension}:q-${String(raw.id).padStart(3, "0")}:${optionId}`,
        score,
        weights: makeWeights(raw.dimension, score),
      };
    }),
  };
});

export const resultLevels: ResultLevel[] = [
  {
    name: "稳住型",
    range: [86, 100],
    verdict: "离草台班子还有三站地铁，兄弟们先乐呵",
    description: "流程不乱，责任不推，牛马总算能喘口气。",
    tone: "stable",
  },
  {
    name: "轻草型",
    range: [68, 85],
    verdict: "轻微草味，兄弟先别急着投简历",
    description: "大体能转，偶尔群里救火，赶紧补流程。",
    tone: "healthy",
  },
  {
    name: "草预警型",
    range: [50, 67],
    verdict: "草台味冲上来了，兄弟们醒醒",
    description: "靠人情加班硬撑，牛马续航强不是机制强。",
    tone: "warning",
  },
  {
    name: "重草型",
    range: [32, 49],
    verdict: "他妈的依托答辩预备役",
    description: "决策看心情，责任橡皮筋，谁倒霉谁先上。",
    tone: "danger",
  },
  {
    name: "纯草台型",
    range: [0, 31],
    verdict: "纯依托答辩，草台班子都配不上",
    description: "已经不是草台，是路边破棚子。还不跑你是抖M？",
    tone: "collapse",
  },
];

export const allDimensions = dimensions.map(({ id, name }) => ({ id, name }));

export function validateQuestionBank() {
  if (questionBank.length !== 250) {
    throw new Error(`Question bank size is ${questionBank.length}, expected 250.`);
  }

  const ids = new Set<string>();
  const visibleTexts = new Set<string>();

  questionBank.forEach((question) => {
    if (ids.has(question.id)) {
      throw new Error(`Duplicate question id: ${question.id}.`);
    }

    if (visibleTexts.has(question.text)) {
      throw new Error(`Duplicate question text: ${question.text}.`);
    }

    if (countCharacters(question.text) > 48) {
      throw new Error(`Question text is over 48 characters: ${question.text}.`);
    }

    ids.add(question.id);
    visibleTexts.add(question.text);

    if (question.options.length !== 4) {
      throw new Error(`${question.id} does not have 4 options.`);
    }

    const optionIds = new Set<OptionId>();
    question.options.forEach((option) => {
      if (optionIds.has(option.id)) {
        throw new Error(`Duplicate option id in ${question.id}: ${option.id}.`);
      }

      if (!option.label.trim()) {
        throw new Error(`${question.id}/${option.id} option text is empty.`);
      }

      optionIds.add(option.id);
    });
  });
}
