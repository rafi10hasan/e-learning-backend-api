import { QuizSession } from "../app/modules/quiz-session/quiz.session.model";
import cron from 'node-cron'


export const initializeQuizCrons = () => {

cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date(); 

    console.log(`[Cron Job] Checking for expired quiz sessions at: ${now.toISOString()}`);

    const result = await QuizSession.deleteMany({
      status: 'in_progress', 
      $expr: {
        $lt: [
          {
            $add: [
              "$startedAt",
              { $multiply: ["$durationSeconds", 1000] } 
            ]
          },
          now
        ]
      }
    });

    if (result.deletedCount > 0) {
      console.log(`[Cron Job] Successfully deleted ${result.deletedCount} expired quiz sessions.`);
    }

  } catch (error) {
    console.error("[Cron Job Error] Failed to delete expired sessions:", error);
  }
})};