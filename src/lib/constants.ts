import { Priority, Task, TaskStatus, TelemetryPoint, FileItem } from '@/types';

export const MOCK_TELEMETRY: TelemetryPoint[] = Array.from(
  { length: 20 },
  (_, i) => ({
    time: `10:00:${i < 10 ? '0' + i : i}`,
    speed: 100 + Math.random() * 50,
    rpm: 4000 + Math.random() * 2000,
    gear: 3,
    throttle: 80,
    brake: 0,
  })
);

export const INITIAL_TASKS: Task[] = [
  {
    id: 't-1',
    title: 'Front Wing Adjust',
    description:
      'Decrease angle by 1.5 degrees for better straight-line speed.',
    status: TaskStatus.TODO,
    priority: Priority.HIGH,
    assignee: 'M. Sato',
  },
  {
    id: 't-2',
    title: 'ECU Firmware Update',
    description: 'Patch v2.4.1 for fuel injection timing.',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.CRITICAL,
    assignee: 'J. Doe',
  },
  {
    id: 't-3',
    title: 'Tire Pressure Check',
    description: 'Analyze wear on soft compounds after stint 1.',
    status: TaskStatus.DONE,
    priority: Priority.MEDIUM,
    assignee: 'Pit Crew A',
  },
  {
    id: 't-4',
    title: 'Gearbox Calibration',
    description: 'Sync shift timings for turns 4 and 5.',
    status: TaskStatus.TODO,
    priority: Priority.MEDIUM,
    assignee: 'Eng. Team',
  },
];

export const INITIAL_FILES: FileItem[] = [
  {
    id: 'event-1',
    parentId: 'root',
    name: 'Buriram GT3 Series',
    type: 'folder',
    date: '2023-10-15',
  },
  {
    id: 'event-2',
    parentId: 'root',
    name: 'Sepang Winter Test',
    type: 'folder',
    date: '2023-11-02',
  },
  {
    id: 'event-3',
    parentId: 'root',
    name: 'Suzuka Shake-down',
    type: 'folder',
    date: '2023-09-20',
  },

  // Event 1 Contents
  {
    id: 'lap-1',
    parentId: 'event-1',
    name: 'Lap 1 - Warmup',
    type: 'folder',
    date: '2023-10-15 14:00',
  },
  {
    id: 'lap-2',
    parentId: 'event-1',
    name: 'Lap 2 - Hot Lap',
    type: 'folder',
    date: '2023-10-15 14:05',
  },
  {
    id: 'summary',
    parentId: 'event-1',
    name: 'Session_Summary.csv',
    type: 'csv',
    size: '2.4 MB',
    date: '2023-10-15 14:30',
  },

  // Lap 2 Contents (Specific Requirement: Telemetry CSV + 3 Camera MP4s)
  {
    id: 'f-1',
    parentId: 'lap-2',
    name: 'telemetry_data.csv',
    type: 'csv',
    size: '4.2 MB',
    date: '14:05:01',
  },
  {
    id: 'f-2',
    parentId: 'lap-2',
    name: 'Front_Camera.mp4',
    type: 'mp4',
    size: '135 MB',
    date: '14:05:01',
  },
  {
    id: 'f-3',
    parentId: 'lap-2',
    name: 'Cockpit_Camera.mp4',
    type: 'mp4',
    size: '128 MB',
    date: '14:05:01',
  },
  {
    id: 'f-4',
    parentId: 'lap-2',
    name: 'Rear_Camera.mp4',
    type: 'mp4',
    size: '120 MB',
    date: '14:05:01',
  },
];

export const DEFAULT_BRAND_CONFIG = {
  platformName: 'Racing Platform',
  logoUrl: '/logo1.png',
};
