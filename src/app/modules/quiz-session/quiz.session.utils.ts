import { IQuizSession } from "./quiz.session.interface";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
 
export function getRemaining(session: Pick<IQuizSession, "startedAt" | "durationSeconds">): number {
  const expireAt = session.startedAt.getTime() + session.durationSeconds * 1000;
  return Math.max(0, (expireAt - Date.now()) / 1000);
}


export function calcElapsed(lastActiveAt: Date, remaining: number): number {
  const raw = (Date.now() - lastActiveAt.getTime()) / 1000;
  return Math.min(raw, remaining);
}
 
// 50 questions, 3 subjects → [17, 17, 16]

export function splitCountBySubject(total: number, subjectCount: number): number[] {
  const base      = Math.floor(total / subjectCount);
  const remainder = total % subjectCount;
  return Array.from({ length: subjectCount }, (_, i) =>
    i < remainder ? base + 1 : base
  );
}