export interface GoogleFormsInfo {
  title?: string;
  documentTitle?: string;
  description?: string;
}

export interface GoogleFormsQuizSettings {
  isQuiz?: boolean;
}

export interface GoogleFormsSettings {
  quizSettings?: GoogleFormsQuizSettings;
}

export interface GoogleFormsImage {
  contentUri?: string;
  altText?: string;
  sourceUri?: string;
  properties?: {
    alignment?: string;
    width?: number;
  };
}

export interface GoogleFormsOption {
  value?: string;
  image?: GoogleFormsImage;
  isOther?: boolean;
  goToAction?: string;
  goToSectionId?: string;
}

export interface GoogleFormsChoiceQuestion {
  type?: string;
  options?: GoogleFormsOption[];
  shuffle?: boolean;
}

export interface GoogleFormsTextQuestion {
  paragraph?: boolean;
}

export interface GoogleFormsScaleQuestion {
  low?: number;
  high?: number;
  lowLabel?: string;
  highLabel?: string;
}

export interface GoogleFormsDateQuestion {
  includeTime?: boolean;
  includeYear?: boolean;
}

export interface GoogleFormsTimeQuestion {
  duration?: boolean;
}

export interface GoogleFormsFileUploadQuestion {
  folderId?: string;
  types?: string[];
  maxFiles?: number;
  maxFileSize?: string;
}

export interface GoogleFormsRatingQuestion {
  ratingScaleLevel?: number;
  iconType?: string;
}

export interface GoogleFormsFeedback {
  text?: string;
  material?: any[];
}

export interface GoogleFormsCorrectAnswers {
  answers?: { value?: string }[];
}

export interface GoogleFormsGrading {
  pointValue?: number;
  correctAnswers?: GoogleFormsCorrectAnswers;
  whenRight?: GoogleFormsFeedback;
  whenWrong?: GoogleFormsFeedback;
  generalFeedback?: GoogleFormsFeedback;
}

export interface GoogleFormsQuestion {
  questionId?: string;
  required?: boolean;
  grading?: GoogleFormsGrading;
  choiceQuestion?: GoogleFormsChoiceQuestion;
  textQuestion?: GoogleFormsTextQuestion;
  scaleQuestion?: GoogleFormsScaleQuestion;
  dateQuestion?: GoogleFormsDateQuestion;
  timeQuestion?: GoogleFormsTimeQuestion;
  fileUploadQuestion?: GoogleFormsFileUploadQuestion;
  rowQuestion?: { title?: string };
  ratingQuestion?: GoogleFormsRatingQuestion;
}

export interface GoogleFormsQuestionItem {
  question?: GoogleFormsQuestion;
  image?: GoogleFormsImage;
}

export interface GoogleFormsGrid {
  columns?: GoogleFormsChoiceQuestion;
  shuffleQuestions?: boolean;
}

export interface GoogleFormsQuestionGroupItem {
  questions?: GoogleFormsQuestion[];
  image?: GoogleFormsImage;
  grid?: GoogleFormsGrid;
}

export interface GoogleFormsItem {
  itemId?: string;
  title?: string;
  description?: string;
  questionItem?: GoogleFormsQuestionItem;
  questionGroupItem?: GoogleFormsQuestionGroupItem;
  pageBreakItem?: Record<string, never>;
  textItem?: Record<string, never>;
  imageItem?: { image?: GoogleFormsImage };
  videoItem?: { video?: { youtubeUri?: string; properties?: any }; caption?: string };
}

export interface GoogleForm {
  formId?: string;
  info?: GoogleFormsInfo;
  settings?: GoogleFormsSettings;
  items?: GoogleFormsItem[];
  revisionId?: string;
  responderUri?: string;
  linkedSheetId?: string;
}

export interface GoogleFormsTextAnswer {
  value?: string;
}

export interface GoogleFormsTextAnswers {
  answers?: GoogleFormsTextAnswer[];
}

export interface GoogleFormsFileUploadAnswer {
  fileId?: string;
  fileName?: string;
  mimeType?: string;
}

export interface GoogleFormsFileUploadAnswers {
  answers?: GoogleFormsFileUploadAnswer[];
}

export interface GoogleFormsGrade {
  score?: number;
  correct?: boolean;
  feedback?: GoogleFormsFeedback;
}

export interface GoogleFormsAnswer {
  questionId?: string;
  grade?: GoogleFormsGrade;
  textAnswers?: GoogleFormsTextAnswers;
  fileUploadAnswers?: GoogleFormsFileUploadAnswers;
}

export interface GoogleFormResponse {
  formId?: string;
  responseId?: string;
  createTime?: string;
  lastSubmittedTime?: string;
  respondentEmail?: string;
  totalScore?: number;
  answers?: Record<string, GoogleFormsAnswer>;
}

export interface GoogleFormsWatch {
  id?: string;
  eventType?: string;
  target?: {
    topic?: {
      topicName?: string;
    };
  };
  createTime?: string;
  expireTime?: string;
  errorType?: string;
  state?: string;
}

export interface GoogleFormsListResponsesResult {
  responses?: GoogleFormResponse[];
  nextPageToken?: string;
}

export interface GoogleFormsListWatchesResult {
  watches?: GoogleFormsWatch[];
}

export interface GoogleFormsBatchUpdateRequest {
  includeFormInResponse?: boolean;
  requests?: any[];
  writeControl?: {
    requiredRevisionId?: string;
    targetRevisionId?: string;
  };
}

export interface GoogleFormsBatchUpdateResponse {
  form?: GoogleForm;
  replies?: any[];
  writeControl?: {
    requiredRevisionId?: string;
    targetRevisionId?: string;
  };
}
