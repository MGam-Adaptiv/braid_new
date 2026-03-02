
import { AnalyticsEvent, Activity, PageSource } from '../types';

// Simulated Analytics Store
const events: AnalyticsEvent[] = [];

export const logPageUpload = (userId: string, page: PageSource, workspaceId: string | null) => {
  const event: AnalyticsEvent = {
    id: `ev_${Math.random().toString(36).substr(2, 9)}`,
    type: 'page_upload',
    userId,
    workspaceId,
    publisher: page.publisher,
    bookTitle: page.bookTitle,
    activityType: null,
    level: null,
    shapingDuration: null,
    timestamp: Date.now()
  };
  events.push(event);
};

export const logActivityCreated = (userId: string, activity: Activity, workspaceId: string | null) => {
  const event: AnalyticsEvent = {
    id: `ev_${Math.random().toString(36).substr(2, 9)}`,
    type: 'activity_created',
    userId,
    workspaceId,
    publisher: 'N/A', 
    bookTitle: 'N/A',
    activityType: activity.type,
    level: activity.level,
    shapingDuration: null,
    timestamp: Date.now()
  };
  events.push(event);
};

export const logActivityApproved = (userId: string, activityId: string, shapingDuration: number, workspaceId: string | null) => {
  const event: AnalyticsEvent = {
    id: `ev_${Math.random().toString(36).substr(2, 9)}`,
    type: 'activity_approved',
    userId,
    workspaceId,
    publisher: 'N/A',
    bookTitle: 'N/A',
    activityType: null,
    level: null,
    shapingDuration,
    timestamp: Date.now()
  };
  events.push(event);
};

export const logActivityUsed = (userId: string, activityId: string) => {
  const event: AnalyticsEvent = {
    id: `ev_${Math.random().toString(36).substr(2, 9)}`,
    type: 'activity_used',
    userId,
    workspaceId: null, // Would be fetched in real DB
    publisher: 'N/A',
    bookTitle: 'N/A',
    activityType: null,
    level: null,
    shapingDuration: null,
    timestamp: Date.now()
  };
  events.push(event);
};

// ADMIN ANALYTICS READS
export const getPublisherBreakdown = (dateRange: { start: number, end: number }) => {
  const filtered = events.filter(e => e.timestamp >= dateRange.start && e.timestamp <= dateRange.end);
  const counts: Record<string, number> = {};
  filtered.forEach(e => {
    counts[e.publisher] = (counts[e.publisher] || 0) + 1;
  });
  return counts;
};

export const getTopBooks = (limit: number = 5) => {
  const counts: Record<string, number> = {};
  events.filter(e => e.type === 'page_upload').forEach(e => {
    counts[e.bookTitle] = (counts[e.bookTitle] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
};

export const getActivityTypeBreakdown = (dateRange: { start: number, end: number }) => {
  const filtered = events.filter(e => e.type === 'activity_created' && e.timestamp >= dateRange.start && e.timestamp <= dateRange.end);
  const counts: Record<string, number> = {};
  filtered.forEach(e => {
    if (e.activityType) {
      counts[e.activityType] = (counts[e.activityType] || 0) + 1;
    }
  });
  return counts;
};

export const getApprovalRateByTeacher = (dateRange: { start: number, end: number }) => {
  const created = events.filter(e => e.type === 'activity_created' && e.timestamp >= dateRange.start && e.timestamp <= dateRange.end);
  const approved = events.filter(e => e.type === 'activity_approved' && e.timestamp >= dateRange.start && e.timestamp <= dateRange.end);
  
  const teacherStats: Record<string, { created: number, approved: number }> = {};
  
  created.forEach(e => {
    if (!teacherStats[e.userId]) teacherStats[e.userId] = { created: 0, approved: 0 };
    teacherStats[e.userId].created++;
  });
  
  approved.forEach(e => {
    if (!teacherStats[e.userId]) teacherStats[e.userId] = { created: 0, approved: 0 };
    teacherStats[e.userId].approved++;
  });
  
  return teacherStats;
};

export const getUsagePatterns = (dateRange: { start: number, end: number }) => {
  const filtered = events.filter(e => e.type === 'activity_used' && e.timestamp >= dateRange.start && e.timestamp <= dateRange.end);
  // Returns count per day
  const daily: Record<string, number> = {};
  filtered.forEach(e => {
    const day = new Date(e.timestamp).toISOString().split('T')[0];
    daily[day] = (daily[day] || 0) + 1;
  });
  return daily;
};
