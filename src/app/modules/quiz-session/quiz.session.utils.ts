import { Types } from "mongoose";
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

export function sortWithPassage(
  questions: { _id: Types.ObjectId; subject: Types.ObjectId; passage?: Types.ObjectId; order?: number }[]
) {
  const withPassage    = questions.filter((q) => q.passage);
  const withoutPassage = questions.filter((q) => !q.passage);

  const passageMap = new Map<string, typeof withPassage>();
  for (const q of withPassage) {
    const key = q.passage!.toString();
    if (!passageMap.has(key)) passageMap.set(key, []);
    passageMap.get(key)!.push(q);
  }

  const sortedPassageGroups = [...passageMap.values()].map((group) =>
    group.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );

  return [...sortedPassageGroups.flat(), ...withoutPassage];
}