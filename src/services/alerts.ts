import { Alert, Delta, PoolMetric, ThresholdRules } from "../types/index.js";
import { storageService } from "./storage.js";

export class AlertService {
  checkThresholds(deltas: Delta[], current: PoolMetric[], thresholds: ThresholdRules): Alert[] {
    const alerts: Alert[] = [];
    
    for (const delta of deltas) {
      const currentMetric = current.find(m => m.pool_id === delta.pool_id);
      if (!currentMetric) continue;
      
      const history = storageService.getHistory(delta.pool_id);
      const previous = history[history.length - 1];
      if (!previous) continue;
      
      // APY spike alert
      if (thresholds.apy_spike_percent && delta.apy_change_percent > thresholds.apy_spike_percent) {
        alerts.push({
          pool_id: delta.pool_id,
          alert_type: "apy_spike",
          severity: delta.apy_change_percent > thresholds.apy_spike_percent * 2 ? "critical" : "high",
          message: `APY spiked by ${delta.apy_change_percent.toFixed(4)}% in ${delta.blocks_elapsed} blocks (${previous.apy.toFixed(4)}% → ${currentMetric.apy.toFixed(4)}%)`,
          current_value: currentMetric.apy,
          previous_value: previous.apy,
          change_percent: delta.apy_change_percent,
          threshold_breached: thresholds.apy_spike_percent,
          timestamp: currentMetric.timestamp,
          block_number: currentMetric.block_number
        });
      }
      
      // APY drop alert
      if (thresholds.apy_drop_percent && delta.apy_change_percent < -thresholds.apy_drop_percent) {
        alerts.push({
          pool_id: delta.pool_id,
          alert_type: "apy_drop",
          severity: delta.apy_change_percent < -thresholds.apy_drop_percent * 2 ? "critical" : "high",
          message: `APY dropped by ${Math.abs(delta.apy_change_percent).toFixed(4)}% in ${delta.blocks_elapsed} blocks (${previous.apy.toFixed(4)}% → ${currentMetric.apy.toFixed(4)}%)`,
          current_value: currentMetric.apy,
          previous_value: previous.apy,
          change_percent: delta.apy_change_percent,
          threshold_breached: thresholds.apy_drop_percent,
          timestamp: currentMetric.timestamp,
          block_number: currentMetric.block_number
        });
      }
      
      // TVL drain alert
      if (thresholds.tvl_drain_percent && delta.tvl_change_percent < -thresholds.tvl_drain_percent) {
        alerts.push({
          pool_id: delta.pool_id,
          alert_type: "tvl_drain",
          severity: delta.tvl_change_percent < -thresholds.tvl_drain_percent * 2 ? "critical" : "high",
          message: `TVL drained by ${Math.abs(delta.tvl_change_percent).toFixed(4)}% in ${delta.blocks_elapsed} blocks ($${previous.tvl.toLocaleString()} → $${currentMetric.tvl.toLocaleString()})`,
          current_value: currentMetric.tvl,
          previous_value: previous.tvl,
          change_percent: delta.tvl_change_percent,
          threshold_breached: thresholds.tvl_drain_percent,
          timestamp: currentMetric.timestamp,
          block_number: currentMetric.block_number
        });
      }
      
      // TVL surge alert
      if (thresholds.tvl_surge_percent && delta.tvl_change_percent > thresholds.tvl_surge_percent) {
        alerts.push({
          pool_id: delta.pool_id,
          alert_type: "tvl_surge",
          severity: delta.tvl_change_percent > thresholds.tvl_surge_percent * 2 ? "high" : "medium",
          message: `TVL surged by ${delta.tvl_change_percent.toFixed(4)}% in ${delta.blocks_elapsed} blocks ($${previous.tvl.toLocaleString()} → $${currentMetric.tvl.toLocaleString()})`,
          current_value: currentMetric.tvl,
          previous_value: previous.tvl,
          change_percent: delta.tvl_change_percent,
          threshold_breached: thresholds.tvl_surge_percent,
          timestamp: currentMetric.timestamp,
          block_number: currentMetric.block_number
        });
      }
    }
    
    return alerts;
  }
}

export const alertService = new AlertService();
