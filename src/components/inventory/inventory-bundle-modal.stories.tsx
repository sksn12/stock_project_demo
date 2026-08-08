import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { getChannelInventoryBySku } from '@/lib/greenfood-channel-data';
import { INVENTORY_PRODUCTS } from '@/lib/inventory-control-data';
import { InventoryBundleModal, type BundleSourceItem } from './inventory-bundle-modal';

const baseProduct = INVENTORY_PRODUCTS[0];
const baseSku = baseProduct.skus[0];
const partnerProduct = INVENTORY_PRODUCTS[1];
const partnerSku = partnerProduct.skus[0];
const selectedItems: BundleSourceItem[] = [
  { product: baseProduct, sku: baseSku, channel: getChannelInventoryBySku(baseSku.id)[0] },
  { product: partnerProduct, sku: partnerSku, channel: getChannelInventoryBySku(partnerSku.id)[0] },
];

const meta = {
  component: InventoryBundleModal,
  tags: ['ai-generated'],
  args: {
    selectedItems,
    onClose: fn(),
    onSaved: fn(),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/inventory/all' } },
  },
} satisfies Meta<typeof InventoryBundleModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RecommendedBundle: Story = {};

export const DirectSearchInteraction: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '직접 검색' }));
    await expect(canvas.getByPlaceholderText('상품명, 상품코드, SKU 코드, 옵션 검색')).toBeVisible();
  },
};
