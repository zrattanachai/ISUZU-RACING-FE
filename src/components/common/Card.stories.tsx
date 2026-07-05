import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

const meta = {
  title: 'Common/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Engine Telemetry</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground/80 text-sm">
          Live stream of core engine metrics including RPM, Oil Pressure, and
          Water Temp.
        </p>
      </CardContent>
    </Card>
  ),
};
