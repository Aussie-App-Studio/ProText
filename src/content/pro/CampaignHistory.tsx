import { useEffect, useState } from 'react';
import { getCampaigns, getCampaignLogs, deleteCampaign, type Campaign, type CampaignLog } from '../db';
import { dispatcher } from './dispatcher';

export function CampaignHistory({ onOpenDispatcher }: { onOpenDispatcher?: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadCampaigns = async () => {
    const list = await getCampaigns();
    setCampaigns(list);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleSelectCampaign = async (id: string) => {
    if (selectedCampaignId === id) {
      setSelectedCampaignId(null);
      setLogs([]);
      return;
    }
    setSelectedCampaignId(id);
    setLoadingLogs(true);
    const campaignLogs = await getCampaignLogs(id);
    setLogs(campaignLogs);
    setLoadingLogs(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign history and its delivery logs?')) return;
    await deleteCampaign(id);
    if (selectedCampaignId === id) {
      setSelectedCampaignId(null);
      setLogs([]);
    }
    await loadCampaigns();
  };

  const handleRetryFailed = async (campaignId: string) => {
    try {
      await dispatcher.retryFailed(campaignId);
      onOpenDispatcher?.();
    } catch (err: any) {
      alert(err.message || 'Failed to retry');
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs text-gray-200">
      <div>
        <h3 className="text-sm font-semibold text-white">Past Group Messages</h3>
        <p className="text-[11px] text-gray-400">
          Review past group announcements, check which messages went through, and retry any numbers that didn't deliver.
        </p>
      </div>

      <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
        {campaigns.map(camp => {
          const isSelected = selectedCampaignId === camp.id;
          const successRate = camp.total > 0 ? Math.round((camp.sent / camp.total) * 100) : 0;
          const dateStr = new Date(camp.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={camp.id}
              className={`rounded-xl border transition-all ${
                isSelected
                  ? 'border-blue-500/70 bg-[#22252a] shadow-lg'
                  : 'border-gray-700/60 bg-[#1e1f23] hover:border-gray-600'
              } p-3.5`}
            >
              {/* Campaign Header Row */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">{camp.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${
                        camp.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : camp.status === 'running'
                          ? 'bg-blue-500/20 text-blue-300'
                          : camp.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{dateStr}</span>
                </div>

                <div className="flex items-center gap-2">
                  {camp.failed > 0 && (
                    <button
                      onClick={() => handleRetryFailed(camp.id)}
                      className="cursor-pointer rounded-lg bg-amber-600/90 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-500 transition-colors shadow-sm"
                    >
                      Retry Failed ({camp.failed})
                    </button>
                  )}
                  <button
                    onClick={() => handleSelectCampaign(camp.id)}
                    className="cursor-pointer rounded-lg bg-gray-700/80 px-2 py-1 text-[11px] font-medium text-gray-200 hover:bg-gray-600 transition-colors"
                  >
                    {isSelected ? 'Hide Logs ▲' : 'View Logs ▼'}
                  </button>
                  <button
                    onClick={() => handleDelete(camp.id)}
                    className="cursor-pointer text-gray-400 hover:text-red-400 p-1 text-xs"
                    title="Delete campaign history"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Progress & Stats Row */}
              <div className="flex items-center gap-4 text-[11px] text-gray-300 mb-2">
                <span>Total: <strong className="text-white">{camp.total}</strong></span>
                <span>Sent: <strong className="text-emerald-400">{camp.sent}</strong></span>
                <span>Failed: <strong className="text-red-400">{camp.failed}</strong></span>
                <span>Success Rate: <strong className="text-blue-400">{successRate}%</strong></span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-gray-700/80 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${camp.total > 0 ? (camp.sent / camp.total) * 100 : 0}%` }}
                />
                <div
                  className="bg-red-500 h-full transition-all duration-300"
                  style={{ width: `${camp.total > 0 ? (camp.failed / camp.total) * 100 : 0}%` }}
                />
              </div>

              {/* Expanded Logs */}
              {isSelected && (
                <div className="mt-3 border-t border-gray-700/60 pt-3">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2">
                    Detailed Recipient Logs ({logs.length})
                  </div>

                  {loadingLogs ? (
                    <div className="text-center py-3 text-gray-400 text-xs">Loading logs...</div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-3 text-gray-500 text-xs">No logs recorded.</div>
                  ) : (
                    <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                      {logs.map(log => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/60 px-2.5 py-1.5 text-[11px]"
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold text-gray-200 mr-2">
                              {log.name || 'Contact'}
                            </span>
                            <span className="font-mono text-gray-400">{log.phone}</span>
                            {log.error && (
                              <span className="text-red-400 block text-[10px] mt-0.5 truncate">
                                Error: {log.error}
                              </span>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                              log.status === 'sent'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : log.status === 'failed'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {campaigns.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
            No campaign history found. Run your first campaign using the Campaign Dispatcher.
          </div>
        )}
      </div>
    </div>
  );
}
