import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ArrowRight, Plus, Save } from 'lucide-react';
import { expect, fn } from 'storybook/test';
import { Button } from './button';

const meta = {
  component: Button,
  tags: ['ai-generated'],
  args: {
    children: '전략 생성',
    onClick: fn(),
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'danger', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: '전략 생성' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'AI 추천 적용' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: '초안 저장', leftIcon: <Save className="h-4 w-4" /> },
};

export const Danger: Story = {
  args: { variant: 'danger', children: '전략 삭제' },
};

export const Loading: Story = {
  args: { loading: true, children: '분석 중' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '분석 중' })).toHaveAttribute('aria-busy', 'true');
  },
};

export const WithIcons: Story = {
  args: {
    children: '번들 추가',
    leftIcon: <Plus className="h-4 w-4" />,
    rightIcon: <ArrowRight className="h-4 w-4" />,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-6">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
