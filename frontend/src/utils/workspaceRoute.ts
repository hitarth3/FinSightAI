export type WorkspaceView = 'overview' | 'expenses' | 'cards' | 'market' | 'advisor';
const views: WorkspaceView[] = ['overview', 'expenses', 'cards', 'market', 'advisor'];
export function readWorkspaceRoute(hash: string, demo = false): WorkspaceView {
  const value = hash.replace(/^#\/?/, '') as WorkspaceView;
  if (!views.includes(value) || (demo && (value === 'market' || value === 'advisor'))) return 'overview';
  return value;
}
