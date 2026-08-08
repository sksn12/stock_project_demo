import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Sidebar } from './sidebar';

const meta = {
  component: Sidebar,
  tags: ['ai-generated'],
  args: { isOpen: true, onClose: fn() },
  parameters: {
    nextjs: { navigation: { pathname: '/inventory/all' } },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InventoryNavigation: Story = {};

export const StrategyNavigation: Story = {
  parameters: { nextjs: { navigation: { pathname: '/strategy/history' } } },
};

export const Collapsed: Story = {
  args: { isOpen: false },
};
