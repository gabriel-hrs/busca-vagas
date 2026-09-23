import { owner, workspace, checkMutation, failure, put } from '@/lib/server';
import { tailor } from '@/lib/model';
import { demoJobs } from '@/lib/demo';
export async function POST(request: Request) {
  try {
    checkMutation(request);
    const user = await owner(request);
    const { profileId, jobId } = await request.json() as { profileId: string; jobId: string };
    const state = await workspace(user);
    const profile = state.profiles.find(p => p.id === profileId);
    const job = [...state.jobs, ...demoJobs].find(j => j.id === jobId);
    if (!profile || !job) throw new Error('Perfil ou vaga não encontrado.');
    const result = tailor(job, profile);
    await put(user, `resume:${profileId}:${jobId}`, { ...result, jobId, profileId, generatedAt: new Date().toISOString() });
    return Response.json(result);
  } catch (e) { return failure(e); }
}
