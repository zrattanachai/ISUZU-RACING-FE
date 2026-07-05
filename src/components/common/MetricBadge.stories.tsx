import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MetricBadge } from './MetricBadge';
import { Activity } from 'lucide-react';

const meta = {
  title: 'Common/MetricBadge',
  component: MetricBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['normal', 'warning', 'critical'],
    },
  },
} satisfies Meta<typeof MetricBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    label: 'Tire FL',
    value: '85°C',
    status: 'normal',
  },
};

export const Warning: Story = {
  args: {
    label: 'Tire FL',
    value: '105°C',
    status: 'warning',
  },
};

export const Critical: Story = {
  args: {
    label: 'Engine Temp',
    value: '130°C',
    status: 'critical',
    icon: <Activity size={14} />,
  },
};
