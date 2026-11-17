import { useState } from 'react';
import { PageHeader } from '../components/AppNavigation';
import { sessionVideoUrl } from '../services/api';
import { coachFrameStatus, coachRegionEvidence, coachRegionStatus } from '../presentation/posePresentation';
import type { PoseAssessment, QualityAssessment, SessionUploadResponse } from '../types';

type WorkspaceTab = 'overview' | 'deliveries' | 'pose' | 'comparison' | 'report';

export function SessionWorkspacePage({ session, quality, trackingConfirmed, pose, loading, error, onRunAnalysis, onBack, onReviewTracking }: {
  session: SessionUploadResponse;
  quality: QualityAssessment | null;
  trackingConfirmed: boolean;
  pose: PoseAssessment | null;
  loading: boolean;
  error: string | null;
  onRunAnalysis: () => void;
  onBack: () => void;
  onReviewTracking: () => void;
}) {
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const tabs: { id: WorkspaceTab; label: string; available: boolean }[] = [
    { id: 'overview', label: 'Overview', available: true },
    { id: 'deliveries', label: 'Deliveries', available: false },
    { id: 'pose', label: 'Pose analysis', available: true },
    { id: 'comparison', label: 'Comparison', available: false },
    { id: 'report', label: 'Report', available: true },
  ];
  const qualityLabel = quality?.overall_assessment === 'suitable' ? 'Ready for analysis' : quality?.overall_assessment === 'suitable_with_limitations' ? 'Analysis available with limitations' : quality ? 'Unable to analyse this recording' : 'Recording review not run';
  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <button type="button" onClick={onBack} className="mb-4 min-h-10 text-sm font-medium text-text-secondary hover:text-text-primary">← Back to sessions</button>
    <PageHeader eyebrow="Session workspace" title={session.bowler_name} description={`${session.session_date} · ${session.bowling_type} · ${session.bowling_arm} arm · ${session.camera_view} camera view`} />
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-surface-700 bg-surface-800/60 p-1" role="tablist" aria-label="Session workspace">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} disabled={!item.available} title={!item.available ? `${item.label} is not available yet` : undefined} onClick={() => item.available && setTab(item.id)} className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-medium ${!item.available ? 'cursor-not-allowed text-text-muted opacity-50' : tab === item.id ? 'bg-brand-600 text-white' : 'text-text-secondary hover:bg-surface-700'}`}>{item.label}{!item.available && <span className="ml-1 text-[10px]">Soon</span>}</button>)}</div>

    {tab === 'overview' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]"><section className="overflow-hidden rounded-2xl border border-surface-700 bg-black"><video src={sessionVideoUrl(session.session_id)} controls playsInline preload="metadata" className="max-h-[65vh] w-full bg-black object-contain"/><div className="bg-surface-800 p-4"><h2 className="font-semibold">Session recording</h2><p className="mt-1 text-sm text-text-secondary">Bowling action video for {session.bowler_name}.</p></div></section><aside className="space-y-3"><article className="rounded-2xl border border-surface-700 bg-surface-800/60 p-5"><p className="text-xs uppercase tracking-wide text-text-muted">Recording status</p><h2 className="mt-2 font-semibold">{qualityLabel}</h2>{quality && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{quality.overall_assessment === 'suitable' ? 'Initial recording checks passed. Bowler visibility is reviewed separately.' : quality.overall_assessment === 'suitable_with_limitations' ? 'Some recording checks were limited. Review the video as you continue.' : 'The recording check found an issue that may prevent useful analysis.'}</p>}{!quality && <p className="mt-2 text-sm text-text-secondary">Recording review is not available for this saved session yet.</p>}</article><article className="rounded-2xl border border-surface-700 bg-surface-800/60 p-5"><p className="text-xs uppercase tracking-wide text-text-muted">Bowler selection</p><h2 className="mt-2 font-semibold">{trackingConfirmed ? 'Interval confirmed' : 'Needs review'}</h2><p className="mt-2 text-sm text-text-secondary">{trackingConfirmed ? 'A delivery interval is saved for this session.' : 'Select and track the bowler, then confirm a delivery interval.'}</p></article><article className="rounded-2xl border border-surface-700 bg-surface-800/60 p-5"><p className="text-xs uppercase tracking-wide text-text-muted">Movement review</p><h2 className="mt-2 font-semibold">{pose ? `${pose.detected_frame_count} sampled moments with pose` : 'Not completed'}</h2><p className="mt-2 text-sm text-text-secondary">{pose ? pose.pose_validation_status === 'valid' ? 'Body landmarks were detected clearly in sampled moments.' : 'Some movements need visual review or could not be assessed.' : 'Pose results appear here after the review is run.'}</p></article><button type="button" onClick={onRunAnalysis} disabled={loading} className="min-h-12 w-full rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Reviewing session…' : pose ? 'Refresh available results' : 'Continue to analysis'}</button><button type="button" onClick={onReviewTracking} className="min-h-11 w-full rounded-xl border border-surface-600 px-4 text-sm">{trackingConfirmed ? 'Review bowler selection' : 'Select and track the bowler'}</button>{error && <p role="alert" className="rounded-xl border border-accent-amber/30 bg-amber-950/20 p-3 text-sm text-accent-amber">{error}</p>}</aside></div>}

    {tab === 'deliveries' && <Unavailable title="Delivery cards are not available yet" detail="The current analysis does not identify individual deliveries or delivery key frames. No delivery count is inferred." />}
    {tab === 'comparison' && <Unavailable title="Reference comparison is not available yet" detail="There is no coach-approved reference video or comparison analysis for this session." />}
    {tab === 'pose' && <PosePanel pose={pose} session={session} loading={loading} onRunAnalysis={onRunAnalysis} error={error} />}
    {tab === 'report' && <ReportPanel session={session} quality={quality} pose={pose} />}
  </main>;
}

function PosePanel({ pose, session, loading, onRunAnalysis, error }: { pose: PoseAssessment | null; session: SessionUploadResponse; loading: boolean; onRunAnalysis: () => void; error: string | null }) {
  if (!pose) return <div className="rounded-2xl border border-surface-700 bg-surface-800/60 p-6"><h2 className="text-lg font-semibold">Pose analysis</h2><p className="mt-2 text-sm text-text-secondary">Pose overlays are shown after the bowler is tracked and a delivery interval is confirmed.</p><button type="button" onClick={onRunAnalysis} disabled={loading} className="mt-4 min-h-11 rounded-xl bg-brand-600 px-4 text-sm font-semibold disabled:opacity-50">{loading ? 'Reviewing…' : 'Run pose analysis'}</button>{error && <p className="mt-3 text-sm text-accent-amber">{error}</p>}</div>;
  const summary = pose.pose_validation_status === 'valid' ? 'Body landmarks were detected clearly in sampled moments.' : pose.pose_validation_status === 'invalid' ? 'Some predicted landmarks need visual review.' : pose.detected_frame_count ? 'Some body movements are unclear or could not be checked.' : 'There was not enough visual evidence to assess body landmarks.';
  const labels: Record<string, string> = { head: 'Head', upper_body: 'Upper body', arms: 'Arms', lower_body: 'Lower body' };
  const toneClasses = { green: 'border-brand-500/40 bg-brand-950/20 text-brand-300', amber: 'border-accent-amber/40 bg-amber-950/20 text-accent-amber', red: 'border-accent-red/40 bg-red-950/20 text-red-200', muted: 'border-surface-600 bg-surface-900 text-text-secondary' };
  return <div className="space-y-5">
    <section className="rounded-2xl border border-surface-700 bg-surface-800/60 p-5"><h2 className="text-lg font-semibold">Pose analysis</h2><p className="mt-2 text-sm leading-relaxed text-text-secondary">{summary} This visual check does not judge bowling technique.</p><p className="mt-2 text-sm text-text-muted">Pose detected in {pose.detected_frame_count} of {pose.sampled_frame_count} sampled moments.</p></section>
    <section aria-label="Body region evidence" className="grid gap-3 sm:grid-cols-2">{pose.regions.map((region) => {
      const status = coachRegionStatus(region, pose.validation_schema_version);
      const evidence = coachRegionEvidence(region);
      return <article key={region.name} className="min-w-0 rounded-2xl border border-surface-700 bg-surface-800/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{labels[region.name] ?? 'Body region'}</h3><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[status.tone]}`}>{status.label}</span></div>
        <p className="mt-3 text-sm text-text-secondary">Landmarks detected: {evidence.detected.count} of {evidence.detected.total} moments.</p>
        <p className="mt-1 text-sm text-text-secondary">Enough evidence for checks: {evidence.sufficient.count} of {evidence.sufficient.total} moments.</p>
        <p className="mt-1 text-sm text-text-secondary">Checks passed: {evidence.validated.count} of {evidence.validated.total} moments.</p>
        {(region.insufficient_evidence_frames > 0 || region.failed_frames > 0 || status.tone === 'muted' || status.tone === 'amber' || status.tone === 'red') && <p className="mt-3 text-sm leading-relaxed text-text-secondary">{region.failed_frames > 0 ? `${region.failed_frames} moment(s) had landmarks flagged by checks. ` : ''}{region.insufficient_evidence_frames > 0 ? `${region.insufficient_evidence_frames} moment(s) had insufficient evidence. ` : ''}{status.explanation}</p>}
      </article>;
    })}</section>
    <section className="space-y-3" aria-label="Sampled pose frames"><div><h2 className="text-lg font-semibold">Sampled moments</h2><p className="mt-1 text-sm text-text-secondary">Each frame includes the original image and the detected pose overlay. Uncertain moments remain visible for review.</p></div>
      <div className="grid gap-4 xl:grid-cols-2">{pose.frames.map((frame) => <article key={frame.frame_number} className="overflow-hidden rounded-2xl border border-surface-700 bg-surface-800/60">
        <div className="grid grid-cols-1 gap-px bg-surface-700 sm:grid-cols-2"><figure className="min-w-0 bg-black"><img loading="lazy" src={frame.original_image_url} alt={`Original video frame at ${frame.timestamp_seconds?.toFixed(1) ?? 'unknown'} seconds`} className="aspect-video w-full bg-black object-contain"/><figcaption className="px-3 py-2 text-xs text-text-muted">Original frame</figcaption></figure><figure className="min-w-0 bg-black"><img loading="lazy" src={frame.overlay_image_url} alt={`Pose overlay at ${frame.timestamp_seconds?.toFixed(1) ?? 'unknown'} seconds`} className="aspect-video w-full bg-black object-contain"/><figcaption className="px-3 py-2 text-xs text-text-muted">Pose overlay</figcaption></figure></div>
        <div className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold">{frame.timestamp_seconds === null ? `Frame ${frame.frame_number}` : `${frame.timestamp_seconds.toFixed(2)} seconds`}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${frame.validation_outcome === 'validated' ? 'bg-brand-500/10 text-brand-300' : frame.validation_outcome === 'validation_failed' ? 'bg-red-950/30 text-red-200' : 'bg-amber-950/30 text-accent-amber'}`}>{frame.detected ? 'Pose detected' : 'Pose unclear'}</span></div><p className="mt-2 text-sm leading-relaxed text-text-secondary">{coachFrameStatus(frame.validation_outcome, frame.detected)}</p></div>
      </article>)}</div>
    </section>
    <video src={sessionVideoUrl(session.session_id)} controls playsInline preload="metadata" className="max-h-[65vh] w-full rounded-2xl bg-black object-contain"/>
  </div>;
}

function ReportPanel({ session, quality, pose }: { session: SessionUploadResponse; quality: QualityAssessment | null; pose: PoseAssessment | null }) {
  return <section className="space-y-4"><div className="rounded-2xl border border-surface-700 bg-surface-800/60 p-5"><p className="text-xs uppercase tracking-wide text-text-muted">Session report</p><h2 className="mt-1 text-xl font-semibold">{session.bowler_name}</h2><p className="mt-1 text-sm text-text-secondary">{session.session_date} · <span className="capitalize">{session.bowling_type}</span> · {session.bowling_arm} arm · {session.camera_view} view</p>{session.notes && <p className="mt-4 rounded-xl bg-surface-900 p-3 text-sm text-text-secondary"><span className="font-medium text-text-primary">Coach’s session note: </span>{session.notes}</p>}</div><div className="grid gap-4 md:grid-cols-2"><article className="rounded-2xl border border-surface-700 bg-surface-800/60 p-5"><h3 className="font-semibold">Recording</h3><p className="mt-2 text-sm text-text-secondary">{quality ? quality.overall_assessment === 'not_suitable' ? 'Recording needs review before analysis.' : quality.overall_assessment === 'suitable_with_limitations' ? 'Initial checks passed with limitations.' : 'Initial recording checks passed.' : 'Recording check has not run.'}</p></article><article className="rounded-2xl border border-surface-700 bg-surface-800/60 p-5"><h3 className="font-semibold">Observable landmarks</h3><p className="mt-2 text-sm text-text-secondary">{pose ? `${pose.detected_frame_count} of ${pose.sampled_frame_count} sampled moments showed a pose. ${pose.pose_validation_status === 'valid' ? 'Landmarks passed applicable checks.' : 'Some movement could not be assessed reliably.'}` : 'Pose analysis has not run.'}</p></article></div><Unavailable title="Delivery observations and coaching recommendations are not available yet" detail="Delivery segmentation, technique assessment, recurring patterns and reference comparison have not been implemented. No coaching recommendations are generated from pose detection alone."/></section>;
}

function Unavailable({ title, detail }: { title: string; detail: string }) {
  return <section className="rounded-2xl border border-dashed border-surface-600 bg-surface-800/30 p-8"><p className="font-semibold">{title}</p><p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">{detail}</p></section>;
}
