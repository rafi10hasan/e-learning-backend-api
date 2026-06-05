
import { TUserRole } from "../app/modules/user/user.constant";


export const SOCKET_EVENTS = {
  JOIN_QUIZ: 'join-quiz',
  QUIZ_JOINED: 'quiz-joined',
  COMPLETE_QUIZ: 'complete-quiz',
  QUIZ_COMPLETED: 'quiz-completed',
  LEAVE_QUIZ: 'leave-quiz',
  GET_QUIZZES: 'get-quizzes',
  GET_QUESTION: 'get-question',
  ANSWER_RESULT: 'answer-result',
  MARK_UPDATED: 'mark-updated',
  QUIZ_MAP: 'quiz-map',
  QUESTION: 'question',
  SUBMIT_ANSWER: 'submit-answer',
  NAVIGATE_QUESTION: 'navigate-question',
  MARK_QUESTION: 'mark-question',
  GET_QUIZ_MAP: 'get-quiz-map',
  LEAVE_REVIEW: 'leave-review',
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  EXPIRE_QUIZ: 'expire-quiz',
  QUIZ_EXPIRED: 'quiz-expired',
  ERROR: 'error',
} as const;


export type SocketUser = {
  _id: string;
  email: string;
  role: TUserRole;
};
