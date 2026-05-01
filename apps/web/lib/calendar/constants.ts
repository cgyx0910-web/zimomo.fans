/** 发布时对「导语」最短长度校验，避免程序化空壳 URL */
export const CALENDAR_LEAD_MIN_PUBLISHED_LENGTH = 20;

/** 发布时对「正文」最短长度校验，与百科一致，压低日历详情薄页 */
export const CALENDAR_BODY_MIN_PUBLISHED_LENGTH = 40;

/**
 * ICS 导出：从现在起向前包含已发生但未结束的 + 向后最多天数（UTC），避免日历无限变大。
 */
export const CALENDAR_ICS_FORWARD_DAYS = 365;

/** ICS 回看：含近日已开始的活动 */
export const CALENDAR_ICS_BACK_DAYS = 7;
