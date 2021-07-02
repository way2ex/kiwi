export enum TargetTypes {
  ATTRIBUTE,
  EXPRESSION,
  TEMPLATE_EXPRESSION,
  VUE_TEXT
}

export interface StringSource {
  start: number;
  end: number;
  content: string;
}
export interface BaseStringTarget {
  content: string;
  start: number;
  end: number;
  source: StringSource;
}

export interface AttributeTarget extends BaseStringTarget {
  type: TargetTypes.ATTRIBUTE;
}
export interface ExpressionTarget extends BaseStringTarget {
  type: TargetTypes.EXPRESSION;
}

export interface TemplateExpressionTarget extends BaseStringTarget {
  type: TargetTypes.TEMPLATE_EXPRESSION;
  expressions: StringSource[];
}

export interface VueTemplateText extends BaseStringTarget {
  type: TargetTypes.VUE_TEXT;
}

export type TargetString = AttributeTarget | ExpressionTarget | TemplateExpressionTarget | VueTemplateText;
