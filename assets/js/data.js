export const DISPATCH_DEFAULT = ['劝导自弃后进站', '携带物品离站', '换乘其他交通工具', '现场自助寄件', '移交民警处置'];

export const PRESET_MAP = { '线路': 'line', '站点': 'station', '班长': 'leader', '电话号码': 'leaderPhone' };

export const KIND_META = [
  { kind: 'xa', label: 'A类图像特征', badge: 'A类', cls: 'ban' },
  { kind: 'xb', label: 'B类图像特征', badge: 'B类', cls: 'limit' },
  { kind: 'ban', label: '禁止携带', badge: '禁止携带', cls: 'ban' },
  { kind: 'limit', label: '限制携带', badge: '限制携带', cls: 'limit' },
  { kind: 'rule', label: '处置口径', badge: '处置口径', cls: 'rule' },
  { kind: 'report', label: '汇报口径', badge: '汇报口径', cls: 'rule' },
  { kind: 'duty', label: '勤务考勤', badge: '勤务考勤', cls: 'rule' },
  { kind: 'score', label: '奖惩分值', badge: '奖惩分值', cls: 'rule' },
  { kind: 'exam', label: '考点速记', badge: '考点速记', cls: 'rule' },
  { kind: 'info', label: '便民信息', badge: '便民信息', cls: 'rule' }
];

export const KIND_LABEL = {};

export const KIND_CLS = {};

export const KIND_BADGE = {};
KIND_META.forEach(function (m) {
  KIND_LABEL[m.kind] = m.label; KIND_CLS[m.kind] = m.cls; KIND_BADGE[m.kind] = m.badge;
});

export const MAKER_TYPES = [
  ['text', '文本'], ['number', '数字'], ['date', '日期'], ['time', '时间'],
  ['single', '单选'], ['multi', '多选'], ['entrance', '安检点'], ['member', '人员']
];

export const CLAUSES=[
 {id:'R01',kind:'奖励',label:'查获真子弹1-3颗',min:5,max:15,match:'bullet',tier:[1,3]},
 {id:'R02',kind:'奖励',label:'查获真子弹4-9颗',min:15,max:30,match:'bullet',tier:[4,9]},
 {id:'R03',kind:'奖励',label:'查获真子弹10颗以上',min:30,max:50,match:'bullet',tier:[10,99999]},
 {id:'R04',kind:'奖励',label:'查获雷管等引爆装置',min:10,max:20,match:'detonator'},
 {id:'R05',kind:'奖励',label:'查获爆炸物品(无引爆装置)',min:20,max:40,match:'explosive'},
 {id:'R06',kind:'奖励',label:'查获爆炸物且有引爆装置',min:40,max:50},
 {id:'R07',kind:'奖励',label:'查获汽油/硫酸等刺激性腐蚀性危险品',min:2,max:20,match:'corrosive'},
 {id:'R08',kind:'奖励',label:'查验仿真枪/高仿子弹(经鉴定有杀伤力)',min:2,max:10,match:'fakegun'},
 {id:'R09',kind:'奖励',label:'查获活体动物/宠物',min:1,max:5,match:'animal'},
 {id:'R10',kind:'奖励',label:'查获派出所督导检查人员携带违禁限带品',min:1,max:5},
 {id:'R11',kind:'奖励',label:'查获安检中心级暗访人员携带违禁限带品',min:2,max:10},
 {id:'R12',kind:'奖励',label:'查获集团安监/公安暗访人员携带违禁限带品',min:5,max:20},
 {id:'R13',kind:'奖励',label:'班长查获派出所暗访',min:1,max:1},
 {id:'R14',kind:'奖励',label:'班长查获安检中心级暗访',min:2,max:2},
 {id:'R15',kind:'奖励',label:'班长查获集团公安暗访',min:3,max:5},
 {id:'R16',kind:'奖励',label:'受市局/公司/集团/安检中心表扬表彰',min:10,max:40},
 {id:'R17',kind:'奖励',label:'合理化建议被采纳提升效率',min:10,max:20},
 {id:'R18',kind:'奖励',label:'公司比赛获奖(一等20-40/二等15-30/三等10-20/其他5-15)',min:5,max:40},
 {id:'R19',kind:'奖励',label:'协助抓获违法犯罪/提供线索破案',min:5,max:40},
 {id:'R20',kind:'奖励',label:'站点被各级表扬/媒体正面报道',min:5,max:40},
 {id:'R21',kind:'奖励',label:'处置异常得力受客户表扬',min:5,max:20},
 {id:'R22',kind:'奖励',label:'评为优秀安检员/班长/队长/安检点',min:5,max:15},
 {id:'R23',kind:'奖励',label:'发现事故苗头杜绝事故挽回损失',min:2,max:30},
 {id:'R24',kind:'奖励',label:'乘客书面表扬1-10/锦旗5-20',min:1,max:20},
 {id:'P01',kind:'处罚',label:'违反国家法律法规',min:40,max:40},
 {id:'P02',kind:'处罚',label:'泄露内部信息/不当言论/重大舆论事件',min:40,max:40},
 {id:'P03',kind:'处罚',label:'偷窃公私财物',min:40,max:40},
 {id:'P04',kind:'处罚',label:'猥亵偷拍恐吓殴打辱骂乘客/泄漏乘客信息',min:40,max:40},
 {id:'P05',kind:'处罚',label:'打架斗殴/酗酒酒后闹事',min:20,max:40},
 {id:'P06',kind:'处罚',label:'被政府部门检查发现安检不到位被整改通报',min:20,max:40},
 {id:'P07',kind:'处罚',label:'有效投诉/甲方反馈/网络舆情',min:20,max:40},
 {id:'P08',kind:'处罚',label:'复检台报警推图未按要求开包检查',min:20,max:40},
 {id:'P09',kind:'处罚',label:'不按规定执勤10-20/弄虚作假隐瞒事实20-40',min:10,max:40},
 {id:'P10',kind:'处罚',label:'私自动用公用物品/违禁限带品不及时上交/私藏',min:10,max:40},
 {id:'P11',kind:'处罚',label:'工作场所捡到物品未按要求处置',min:10,max:40},
 {id:'P12',kind:'处罚',label:'损坏公司财物/公共设施(另照价赔偿)',min:10,max:40},
 {id:'P13',kind:'处罚',label:'操作不当管理不到位造成责任客伤',min:10,max:20},
 {id:'P14',kind:'处罚',label:'串岗岗聊精神不佳5/吃零食打闹插兜5-20/岗睡玩手机10-20/站内抽烟20-40',min:5,max:40},
 {id:'P15',kind:'处罚',label:'未发现/未处置敏感信息/设备故障未报修/突发信息报告不及时',min:5,max:40},
 {id:'P16',kind:'处罚',label:'向乘客索取好处/职务之便有损形象',min:5,max:40},
 {id:'P17',kind:'处罚',label:'不爱惜装备致设备物品被挪用损坏',min:5,max:40},
 {id:'P18',kind:'处罚',label:'安检不到位致乘客携带禁限带品进站',min:5,max:40},
 {id:'P19',kind:'处罚',label:'违反属地要求/生活设备用水用电安全',min:5,max:40},
 {id:'P20',kind:'处罚',label:'服务态度差顶撞乘客/管理人员',min:5,max:40},
 {id:'P21',kind:'处罚',label:'不听从指挥不服从管理/顶撞上级',min:5,max:20},
 {id:'P22',kind:'处罚',label:'不按规定着装佩戴装备工作证/仪容坐姿站姿不规范',min:5,max:20},
 {id:'P23',kind:'处罚',label:'未按规定落实车站禁限带品管理',min:5,max:20},
 {id:'P24',kind:'处罚',label:'未按要求复检台考勤打卡(客观原因除外)',min:5,max:20},
 {id:'P25',kind:'处罚',label:'未落实安检设备检查上报测试',min:5,max:20},
 {id:'P26',kind:'处罚',label:'工作不到位致乘客投诉(属实但未定有效)',min:5,max:20},
 {id:'P27',kind:'处罚',label:'迟到早退10分钟内5/10分钟及以上10并谈话',min:5,max:10},
 {id:'P28',kind:'处罚',label:'漏检暗访(班长连带:部门2-5/中心3-7/集团公安5-20)',min:2,max:20},
 {id:'P29',kind:'处罚',label:'漏检暗访(安检员:部门2-5/中心5-10/集团公安10-20)',min:2,max:20},
 {id:'P30',kind:'处罚',label:'业务技能不过关/流程不规范/被中队谈话整改',min:2,max:20},
 {id:'P31',kind:'处罚',label:'未主动引导安检/未做好特殊群体服务',min:2,max:20},
 {id:'P32',kind:'处罚',label:'清洁消杀不到位/设备物品摆放不规范/台账乱写乱撕',min:2,max:10},
 {id:'P33',kind:'处罚',label:'工作证出入码门禁卡违规(按甲方考核条款)',min:0,max:0}
];

export function clauseById(id){return CLAUSES.filter(c=>c.id===id)[0]||null;}



export const MEET_MODS=[
 {id:'m01',title:'三逢原则',text:'严格落实"逢包必检、逢液必检、逢疑必问",发现乘客携带液体的,使用服务手势引导至开包台或不堵塞安检门的地方等待检测。'},
 {id:'m02',title:'复检台任务',text:'复检台推送任务必须百分百开包检查,不得仅凭外观判断或忽略推图任务;现场发现违禁品按流程上报辅警、民警处置。'},
 {id:'m03',title:'六不准纪律',text:'严守安检服务六不准,不得岗聊岗睡、嬉笑窜岗,不得扯衣摘牌、摔物离岗,不得把个人情绪带到工作岗位。'},
 {id:'m04',title:'文明服务',text:'规范使用十字文明用语"您好、请、谢谢、对不起、再见",服务手势到位,严禁与乘客发生语言、肢体冲突,注意服务态度与语气。'},
 {id:'m05',title:'特殊群体服务',text:'主动做好老弱病残孕等特殊群体服务,孕妇、身高1.3米以下儿童、行动不便人士引导绿色通道;携带心脏起搏器、钢钉等金属物品的乘客主动指引。'},
 {id:'m06',title:'仪容仪表',text:'按规定着装、佩戴装备和工作证,标志标识上下班外出途中摘除,严禁着工装玩手机、吃东西,严禁与乘客抢座位。'},
 {id:'m07',title:'保密纪律',text:'内部文件、安检点监控内容、过机图、乘客事务及"三品"信息严格保密,不信谣不传谣,严禁外泄公司内部信息,禁止私自拍过机图发至社交平台。'},
 {id:'m08',title:'台账要求',text:'各项台账如实填写,离岗台账与监控时间保持一致,禁止乱涂乱画、代签漏签、弄虚作假。'},
 {id:'m09',title:'敏感信息处置',text:'牢记五部曲"快遮盖、护现场、速汇报、禁拍照、交现场",发现横幅、举牌、敏感标语服饰等及时遮挡并上报督导、车站、辅警公安。'},
 {id:'m10',title:'设备检查',text:'运营前按规程完成安检机、安检门、手探、炸检、液检自检与测试,安检门灵敏度用模具各测10次,异常及时报厂家并在日检表备注。'},
 {id:'m11',title:'考勤打卡',text:'严格按排班值守,先接岗后签退,打卡选对岗位类型,下班先签退后关机,关机前向班长报备全员打卡无异常。'},
 {id:'m12',title:'液体检查口径',text:'进站乘客携带液体按规定检查,不透明液体礼貌询问能否倒出检测或采样检测,做好解释口径,避免引起不必要的麻烦。'}
];



export const CK_PRESET=[
 {cat:'设备',text:'安检机、安检门、手探、炸检、液检自检正常'},
 {cat:'设备',text:'安检门灵敏度模具测试各10次达标'},
 {cat:'设备',text:'故障设备已报修并在日检表记录'},
 {cat:'设备',text:'日检表填写完整、异常说明清楚'},
 {cat:'人员',text:'全员按排班在岗,无擅自换岗'},
 {cat:'人员',text:'打卡记录完整,无漏打错打'},
 {cat:'人员',text:'仪容仪表、着装、工作证规范'},
 {cat:'人员',text:'手机统一存放,无携带上岗'},
 {cat:'台账',text:'四合一台账如实完整'},
 {cat:'台账',text:'离岗台账与监控时间一致'},
 {cat:'台账',text:'查获物品登记并及时上交'},
 {cat:'台账',text:'无代签、漏签、乱涂乱画'},
 {cat:'服务',text:'文明用语、服务手势规范'},
 {cat:'服务',text:'特殊群体绿色通道主动服务'},
 {cat:'服务',text:'复检台推图100%开包检查'},
 {cat:'敏感',text:'敏感信息处置五部曲掌握'},
 {cat:'敏感',text:'涉敏事件上报流程清楚'},
 {cat:'速查',text:'十大违禁品、限带品数值掌握'},
 {cat:'速查',text:'违禁品/限带品处置口径清楚'}
];


