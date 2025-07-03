import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import * as os from 'os';

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskIOCount: number;
  activeConnections: number;
  timestamp: number;
}

interface ThrottleConfig {
  minInterval: number;
  maxInterval: number;
  currentInterval: number;
  backoffMultiplier: number;
}

export class PerformanceOptimizer extends EventEmitter {
  private static instance: PerformanceOptimizer;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private throttleConfigs = new Map<string, ThrottleConfig>();
  private diskIOCount = 0;
  private activeConnections = 0;
  private emergencyMode = false;
  private lastCpuCheck = 0;
  private cpuUsageHistory: number[] = [];

  private constructor() {
    console.log('PerformanceOptimizer: constructor called');
    super();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  public startMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);
    
    console.log(`🔍 Performance monitoring started (interval: ${intervalMs}ms)`);
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    console.log('🔍 Performance monitoring stopped');
  }

  private collectMetrics(): void {
    const startTime = performance.now();
    
    // Get CPU usage (more accurate for laptops)
    const cpuUsage = process.cpuUsage();
    const now = Date.now();
    const timeDiff = now - this.lastCpuCheck;
    
    if (this.lastCpuCheck > 0) {
      const totalCpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      const cpuPercent = (totalCpuUsage / (timeDiff / 1000)) * 100;
      
      this.cpuUsageHistory.push(cpuPercent);
      if (this.cpuUsageHistory.length > 10) {
        this.cpuUsageHistory.shift();
      }
    }
    
    this.lastCpuCheck = now;
    
    // Get memory usage
    const memUsage = process.memoryUsage();
    const memoryUsageMB = memUsage.heapUsed / 1024 / 1024;
    
    const metrics: PerformanceMetrics = {
      cpuUsage: this.cpuUsageHistory.length > 0 ? this.cpuUsageHistory[this.cpuUsageHistory.length - 1] : 0,
      memoryUsage: memoryUsageMB,
      diskIOCount: this.diskIOCount,
      activeConnections: this.activeConnections,
      timestamp: Date.now()
    };
    
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
    
    // Check for emergency conditions
    this.checkEmergencyConditions(metrics);
    
    // Emit performance warning if thresholds exceeded
    this.checkPerformanceThresholds(metrics);
    
    const endTime = performance.now();
    console.debug(`📊 Performance metrics collected in ${(endTime - startTime).toFixed(2)}ms`);
  }

  private checkEmergencyConditions(metrics: PerformanceMetrics): void {
    const warnings: string[] = [];
    let shouldEnterEmergencyMode = false;
    
    // Much more conservative thresholds for laptops to prevent false triggers
    if (metrics.memoryUsage > 800) { // 800MB threshold (was 300MB)
      warnings.push(`High memory usage: ${metrics.memoryUsage.toFixed(1)}MB`);
      shouldEnterEmergencyMode = true;
    }
    
    if (metrics.cpuUsage > 50) { // 50% CPU threshold (was 20%)
      warnings.push(`High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`);
      shouldEnterEmergencyMode = true;
    }
    
    if (metrics.diskIOCount > 200) { // 200 I/O operations threshold (was 50)
      warnings.push(`High disk I/O: ${metrics.diskIOCount} operations`);
      shouldEnterEmergencyMode = true;
    }
    
    if (metrics.activeConnections > 20) { // 20 connections threshold (was 5)
      warnings.push(`High connection count: ${metrics.activeConnections}`);
    }
    
    // Enter emergency mode if any critical threshold is exceeded
    if (shouldEnterEmergencyMode && !this.emergencyMode) {
      this.enterEmergencyMode();
    } else if (!shouldEnterEmergencyMode && this.emergencyMode) {
      this.exitEmergencyMode();
    }
    
    if (warnings.length > 0) {
      this.emit('performance-warning', { metrics, warnings });
      console.warn('⚠️ Performance warnings:', warnings);
    }
  }

  private enterEmergencyMode(): void {
    this.emergencyMode = true;
    console.log('🚨 ENTERING EMERGENCY PERFORMANCE MODE');
    
    // Immediately increase all throttle intervals to maximum
    for (const [name, config] of this.throttleConfigs) {
      config.currentInterval = config.maxInterval;
    }
    
    // Emit emergency event
    this.emit('emergency-mode');
  }

  private exitEmergencyMode(): void {
    this.emergencyMode = false;
    console.log('✅ Exiting emergency performance mode');
    
    // Gradually decrease throttle intervals
    for (const [name, config] of this.throttleConfigs) {
      config.currentInterval = Math.max(config.minInterval, config.currentInterval / 2);
    }
    
    this.emit('emergency-mode-exit');
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const warnings: string[] = [];
    
    if (metrics.memoryUsage > 500) { // 500MB warning threshold (was 200MB)
      warnings.push(`Memory usage getting high: ${metrics.memoryUsage.toFixed(1)}MB`);
    }
    
    if (metrics.cpuUsage > 30) { // 30% CPU warning threshold (was 10%)
      warnings.push(`CPU usage elevated: ${metrics.cpuUsage.toFixed(1)}%`);
    }
    
    if (metrics.diskIOCount > 100) { // 100 I/O operations warning threshold (was 25)
      warnings.push(`Disk I/O elevated: ${metrics.diskIOCount} operations`);
    }
    
    if (warnings.length > 0) {
      this.emit('performance-warning', { metrics, warnings });
      console.warn('⚠️ Performance warnings:', warnings);
    }
  }

  public createThrottleConfig(
    name: string, 
    minInterval: number = 2000, // Increased minimum intervals
    maxInterval: number = 60000, // Increased maximum intervals
    backoffMultiplier: number = 2.0 // More aggressive backoff
  ): void {
    this.throttleConfigs.set(name, {
      minInterval,
      maxInterval,
      currentInterval: minInterval,
      backoffMultiplier
    });
  }

  public getThrottledInterval(name: string): number {
    const config = this.throttleConfigs.get(name);
    if (!config) return 2000; // Default to 2 seconds
    
    // In emergency mode, always return maximum interval
    if (this.emergencyMode) {
      return config.maxInterval;
    }
    
    return config.currentInterval;
  }

  public increaseThrottle(name: string): void {
    const config = this.throttleConfigs.get(name);
    if (config) {
      config.currentInterval = Math.min(
        config.currentInterval * config.backoffMultiplier,
        config.maxInterval
      );
      console.debug(`🔄 Increased throttle for ${name}: ${config.currentInterval}ms`);
    }
  }

  public decreaseThrottle(name: string): void {
    const config = this.throttleConfigs.get(name);
    if (config && !this.emergencyMode) { // Don't decrease in emergency mode
      config.currentInterval = Math.max(
        config.currentInterval / config.backoffMultiplier,
        config.minInterval
      );
      console.debug(`🔄 Decreased throttle for ${name}: ${config.currentInterval}ms`);
    }
  }

  public recordDiskIO(): void {
    this.diskIOCount++;
    // Reset counter every 30 seconds (was 60 seconds)
    setTimeout(() => {
      this.diskIOCount = Math.max(0, this.diskIOCount - 1);
    }, 30000);
  }

  public recordConnection(active: boolean): void {
    if (active) {
      this.activeConnections++;
    } else {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    }
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public getSystemInfo(): {
    platform: string;
    arch: string;
    cpus: number;
    totalMemory: number;
    nodeVersion: string;
  } {
    return {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      totalMemory: os.totalmem() / 1024 / 1024 / 1024, // GB
      nodeVersion: process.version
    };
  }

  public async optimizeForLowPerformance(): Promise<void> {
    console.log('⚡ Applying low-performance optimizations (laptop-safe)...');
    
    // Increase all throttle intervals to maximum
    for (const [name, config] of this.throttleConfigs) {
      config.currentInterval = config.maxInterval;
    }
    
    // Emit optimization event
    this.emit('low-performance-mode');
  }

  public async optimizeForHighPerformance(): Promise<void> {
    console.log('⚡ Applying high-performance optimizations...');
    
    // Reset all throttle intervals to minimum
    for (const [name, config] of this.throttleConfigs) {
      config.currentInterval = config.minInterval;
    }
    
    // Emit optimization event
    this.emit('high-performance-mode');
  }

  public isInEmergencyMode(): boolean {
    return this.emergencyMode;
  }

  public getEmergencyStatus(): {
    isEmergencyMode: boolean;
    currentMemory: number;
    currentCpu: number;
    currentDiskIO: number;
  } {
    const currentMetrics = this.getCurrentMetrics();
    return {
      isEmergencyMode: this.emergencyMode,
      currentMemory: currentMetrics?.memoryUsage || 0,
      currentCpu: currentMetrics?.cpuUsage || 0,
      currentDiskIO: currentMetrics?.diskIOCount || 0
    };
  }
} 