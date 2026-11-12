// 业务配置 Mock（演示，省级角色维护）
// 对应数据模型 E18；需求 SAF-R09；评审 DEMO-P1-04 缺口补齐
// 所有规则值均为演示规则，页面需标注"待业务确认"
export const BIZ_CONFIG = {
  sections: {
    eventTypes: {
      name: '事件类型字典',
      version: 3,
      effectiveAt: '2026-10-15 09:00',
      updatedBy: '省管理员（演示）',
      approvedStatus: '已生效（演示）',
      value: [
        { code: 'baomai', name: '毁麦毁粮', demoRiskRule: '面积≥100亩或涉及永久基本农田→高风险', demoDeadline: 7, enabled: true },
        { code: 'piaohuang', name: '耕地撂荒', demoRiskRule: '面积≥300亩→高风险；100—300亩→中风险', demoDeadline: 7, enabled: true },
        { code: 'feilianghua', name: '非粮化', demoRiskRule: '涉及永久基本农田→高风险', demoDeadline: 15, enabled: true },
        { code: 'zhangshi', name: '长势异常', demoRiskRule: 'NDVI偏差≥10%→中风险', demoDeadline: 5, enabled: true },
        { code: 'weibeian', name: '未备案收割', demoRiskRule: '围栏联动默认高风险', demoDeadline: 3, enabled: true }
      ]
    },
    reportFields: {
      name: '填报要素配置',
      version: 2,
      effectiveAt: '2026-10-15 09:00',
      updatedBy: '省管理员（演示）',
      approvedStatus: '已生效（演示）',
      value: [
        { field: '核查结论', required: true, enabled: true },
        { field: '核查情况描述', required: true, enabled: true },
        { field: '现场定位（GPS）', required: true, enabled: true },
        { field: '现场证据（照片/视频）', required: true, enabled: true, note: '必须携带采集时间与位置水印' },
        { field: '视频证据', required: false, enabled: true },
        { field: '整改责任人', required: true, enabled: true },
        { field: '整改时限', required: true, enabled: true },
        { field: '整改后照片', required: false, enabled: true, note: '建议必填（演示）' }
      ]
    },
    flowSteps: {
      name: '流转环节配置',
      version: 4,
      effectiveAt: '2026-11-11 10:00',
      updatedBy: '省管理员（演示）',
      approvedStatus: '已生效（演示）',
      value: [
        { step: '待派发', owner: '省/市', demoDeadline: 2, note: '多源线索登记后待派发' },
        { step: '待核查', owner: '县/乡', demoDeadline: 7, note: '任务已下发，现场核查' },
        { step: '已上报', owner: '县/乡→市', demoDeadline: 1, note: '核查上报后待市级接单' },
        { step: '待审核', owner: '市', demoDeadline: 3, note: '市级接单后审核' },
        { step: '已审核（整改中）', owner: '责任单位', demoDeadline: 15, note: '审核通过后整改' },
        { step: '需复查', owner: '市/省', demoDeadline: 5, note: '整改提交后复核' },
        { step: '已结案', owner: '系统', demoDeadline: null, note: '归档并生成事件简报' }
      ]
    }
  }
}
