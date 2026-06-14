'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);

  // Global messages
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  // Webhook form states
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);

  const showMessage = (msg: string, isError: boolean = false) => {
    if (isError) {
      setGlobalError(msg);
      setGlobalSuccess('');
    } else {
      setGlobalSuccess(msg);
      setGlobalError('');
    }
    setTimeout(() => {
      setGlobalError('');
      setGlobalSuccess('');
    }, 5000);
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/accounts/profile');
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (profile?.apiKey && !confirm('Are you sure you want to regenerate your API Key? Game clients using the old key will be denied.')) return;
    try {
      const res = await api.post('/accounts/profile/apikey');
      setProfile((prev: any) => ({ ...prev, apiKey: res.data.apiKey }));
      showMessage('API Key regenerated successfully');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to generate API Key', true);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAccounts();
    const interval = setInterval(fetchAccounts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername) return;
    setIsAdding(true);
    try {
      await api.post('/accounts', { username: newUsername });
      setNewUsername('');
      await fetchAccounts();
      showMessage('Account added successfully');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to add account', true);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to remove this account?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      await fetchAccounts();
      showMessage('Account deleted successfully');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to delete account', true);
    }
  };

  const openWebhookModal = (account: any) => {
    setEditingWebhook(account.id);
    setWebhookUrl(account.webhookSetting?.endpointUrl || '');
    setWebhookSecret(account.webhookSetting?.secretKey || '');
    setWebhookEnabled(account.webhookSetting?.isEnabled || false);
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWebhook) return;
    setWebhookSaving(true);
    try {
      await api.post(`/accounts/${editingWebhook}/webhook`, {
        endpointUrl: webhookUrl,
        secretKey: webhookSecret,
        isEnabled: webhookEnabled,
      });
      await fetchAccounts();
      setEditingWebhook(null);
      showMessage('Webhook settings saved successfully');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to save webhook settings', true);
    } finally {
      setWebhookSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Global Alerts */}
      {(globalError || globalSuccess) && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${globalError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
          {globalError || globalSuccess}
        </div>
      )}

      <div className="flex justify-between items-center bg-gray-900 p-6 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Tiktok Accounts</h2>
          <p className="text-gray-400 text-sm mt-1 mb-3">Manage listeners and webhooks</p>
          <div className="p-2.5 bg-gray-950 rounded-lg border border-gray-800 inline-flex items-center gap-3">
            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Your API Key</span>
            {profile?.apiKey ? (
              <>
                <code className="text-indigo-400 font-mono text-sm bg-indigo-500/10 px-2 py-1 rounded">{profile.apiKey}</code>
                <button onClick={handleRegenerateApiKey} className="text-xs text-gray-400 hover:text-white underline decoration-gray-600 underline-offset-2">Revoke / Regenerate</button>
              </>
            ) : (
              <button onClick={handleRegenerateApiKey} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-medium transition">Generate API Key</button>
            )}
          </div>
        </div>
        <form onSubmit={handleAddAccount} className="flex gap-3">
          <input
            type="text"
            placeholder="Tiktok Username (no @)"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm min-w-[250px]"
          />
          <button
            type="submit"
            disabled={isAdding || !newUsername}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition text-sm"
          >
            {isAdding ? 'Adding...' : 'Add Listener'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center bg-gray-900 p-12 rounded-2xl border border-gray-800 text-gray-500">
          No Tiktok accounts added yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${acc.status === 'ONLINE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : acc.status === 'ERROR' ? 'bg-red-500' : 'bg-gray-500'}`} />
                  <h3 className="text-lg font-semibold text-white">@{acc.username}</h3>
                </div>
                <button
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="text-gray-500 hover:text-red-400 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Connection Status:</span>
                  <span className={`font-medium ${acc.status === 'ONLINE' ? 'text-green-400' : acc.status === 'ERROR' ? 'text-red-400' : 'text-gray-400'}`}>
                    {acc.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Webhook Status:</span>
                  <span className={`font-medium ${acc.webhookSetting?.isEnabled ? 'text-indigo-400' : 'text-gray-500'}`}>
                    {acc.webhookSetting?.isEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openWebhookModal(acc)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-xl transition-all"
                >
                  Configure Webhook
                </button>
                <button
                  onClick={() => window.location.href = `/dashboard/accounts/${acc.id}`}
                  className="flex-1 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 text-sm font-medium rounded-xl transition-all"
                >
                  Live Events
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Webhook Modal */}
      {editingWebhook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Webhook Configuration</h3>
            <form onSubmit={handleSaveWebhook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Endpoint URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://your-server.com/api/tiktok-webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Secret Key (for HMAC SHA256 Signature)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. my-super-secret-key"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm"
                />
              </div>
              <div className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => setWebhookEnabled(!webhookEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${webhookEnabled ? 'bg-indigo-600' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${webhookEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-medium text-gray-300">Enable Webhook Forwarding</span>
              </div>
              
              <div className="flex gap-3 pt-4 mt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingWebhook(null)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={webhookSaving}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm font-medium disabled:opacity-50"
                >
                  {webhookSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
