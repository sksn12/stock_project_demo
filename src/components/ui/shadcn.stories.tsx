import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

function ShadcnInventoryShowcase() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">재고 전략 조건</CardTitle>
              <CardDescription className="mt-1">현대그린푸드 테마를 적용한 shadcn/ui 기본 구성입니다.</CardDescription>
            </div>
            <Badge>AI 추천</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input aria-label="상품 검색" placeholder="상품명 또는 SKU 검색" />
          <Select defaultValue="icheon">
            <SelectTrigger aria-label="물류센터"><SelectValue placeholder="물류센터 선택" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="icheon">이천센터</SelectItem>
              <SelectItem value="dongtan">동탄센터</SelectItem>
            </SelectContent>
          </Select>
          <Tabs defaultValue="inventory">
            <TabsList>
              <TabsTrigger value="inventory">재고</TabsTrigger>
              <TabsTrigger value="profit">매출·이익</TabsTrigger>
            </TabsList>
            <TabsContent value="inventory" className="rounded-md border p-4">가용 재고 1,240개</TabsContent>
            <TabsContent value="profit" className="rounded-md border p-4">예상 공헌이익 ₩1,120만원</TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline">취소</Button>
          <Dialog>
            <DialogTrigger asChild><Button>전략 확인</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>전략을 적용할까요?</DialogTitle>
                <DialogDescription>선택한 조건으로 시뮬레이션을 시작합니다.</DialogDescription>
              </DialogHeader>
              <DialogFooter><Button>시뮬레이션 시작</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}

const meta = {
  title: 'UI/shadcn Inventory Theme',
  component: ShadcnInventoryShowcase,
  tags: ['ai-generated'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ShadcnInventoryShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('tab', { name: '매출·이익' }));
    await expect(canvas.getByText('예상 공헌이익 ₩1,120만원')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '전략 확인' }));
    const body = within(document.body);
    await expect(body.getByRole('dialog')).toHaveAttribute('data-state', 'open');
  },
};
