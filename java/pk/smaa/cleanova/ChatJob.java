package pk.smaa.cleanova;

import android.app.job.JobParameters;
import android.app.job.JobService;

/** Every ~15 minutes looks for new chat messages (the fast service does the same every few seconds when switched on). */
public class ChatJob extends JobService {
    @Override public boolean onStartJob(final JobParameters p) {
        new Thread(new Runnable() { @Override public void run() {
            try { ChatCheck.run(ChatJob.this); } catch (Throwable t) { getSharedPreferences(ChatCheck.PREFS, MODE_PRIVATE).edit().putString("err", String.valueOf(t)).apply(); }
            jobFinished(p, false);
        } }).start();
        return true;
    }
    @Override public boolean onStopJob(JobParameters p) { return true; }
}
