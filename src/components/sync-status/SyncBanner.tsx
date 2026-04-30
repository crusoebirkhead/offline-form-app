import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useSync } from '../../hooks/useSync';
import type { SyncResult } from '../../services/sync';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function summaryText(result: SyncResult): string {
  if (!result.synced) return 'Offline — skipped sync';
  if (result.updated === 0 && result.failed === 0) return 'All forms up to date';
  const parts: string[] = [];
  if (result.updated > 0)
    parts.push(`${result.updated} form${result.updated === 1 ? '' : 's'} updated`);
  if (result.failed > 0) parts.push(`${result.failed} failed`);
  return parts.join(', ');
}

const SUMMARY_DISPLAY_MS = 4000;

interface SyncBannerProps {
  autoSync?: boolean;
}

function SyncBanner({ autoSync = false }: SyncBannerProps) {
  const { isConnected } = useNetworkStatus();
  const { syncing, lastSyncTime, result, error, triggerSync } = useSync();
  const [showSummary, setShowSummary] = useState(false);

  // Auto-sync on mount when requested
  useEffect(() => {
    if (autoSync) {
      triggerSync();
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show summary briefly after sync completes
  useEffect(() => {
    if (result || error) {
      setShowSummary(true);
      const timeout = setTimeout(() => setShowSummary(false), SUMMARY_DISPLAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [result, error]);

  const statusLine = lastSyncTime ? `Synced ${formatRelativeTime(lastSyncTime)}` : 'Never synced';

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        {/* Online/offline indicator */}
        <View style={styles.statusGroup}>
          <View style={[styles.dot, isConnected ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.statusText, isConnected ? styles.textOnline : styles.textOffline]}>
            {isConnected ? 'Online' : 'Offline'}
          </Text>
          <Text style={styles.separator}>{'  \u00B7  '}</Text>
          <Text style={styles.timestampText}>{statusLine}</Text>
        </View>

        {/* Sync Now button / spinner */}
        {syncing ? (
          <ActivityIndicator size="small" color="#1894e1" />
        ) : (
          <Pressable
            onPress={triggerSync}
            disabled={!isConnected}
            accessibilityRole="button"
            accessibilityLabel="Sync Now"
            style={({ pressed }) => [
              styles.syncButton,
              !isConnected && styles.syncButtonDisabled,
              pressed && isConnected && styles.syncButtonPressed,
            ]}
          >
            <Text style={[styles.syncButtonText, !isConnected && styles.syncButtonTextDisabled]}>
              Sync Now
            </Text>
          </Pressable>
        )}
      </View>

      {/* Result summary or error — shown briefly after sync */}
      {showSummary && error && <Text style={styles.errorText}>{error}</Text>}
      {showSummary && !error && result && (
        <Text style={styles.summaryText}>{summaryText(result)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dadce0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#22c55e',
  },
  dotOffline: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textOnline: {
    color: '#166534',
  },
  textOffline: {
    color: '#991b1b',
  },
  separator: {
    fontSize: 13,
    color: '#9aa0a6',
  },
  timestampText: {
    fontSize: 13,
    color: '#5f6368',
  },
  syncButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 96,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.5)',
  },
  syncButtonPressed: {
    backgroundColor: 'rgba(24, 148, 225, 0.08)',
  },
  syncButtonDisabled: {
    backgroundColor: '#f1f3f4',
    borderColor: '#dadce0',
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1894e1',
  },
  syncButtonTextDisabled: {
    color: '#9aa0a6',
  },
  summaryText: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#d93025',
    marginTop: 4,
  },
});

export default SyncBanner;
