import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { Header } from './header';

const meta = {
  component: Header,
  tags: ['ai-generated'],
  args: {
    isSidebarOpen: true,
    onToggleSidebar: fn(),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/inventory/all' } },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InventoryExpanded: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '사이드바 접기' })).toHaveAttribute('aria-expanded', 'true');
  },
};

export const StrategyCollapsed: Story = {
  args: { isSidebarOpen: false },
  parameters: { nextjs: { navigation: { pathname: '/strategy/history' } } },
};

export const CssCheck: Story = {
  play: async ({ canvas }) => {
    const badge = canvas.getByText('재고최적화');
    await expect(getComputedStyle(badge).backgroundColor).toBe('rgb(15, 76, 58)');
  },
};
