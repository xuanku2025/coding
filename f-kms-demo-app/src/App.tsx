import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Copy,
  Dialog,
  DialogBanner,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  Field,
  FieldValue,
  HeaderPage,
  Input,
  NoData,
  NoDataCommonLabel,
  SearchInput,
  Select,
  State,
  Switch,
  Tabs,
  Tag,
  Textarea
} from '@zstack/design';

type ProviderType = 'KMS' | 'NKP';
type ConnectionState = '正常' | '异常' | '连接中';
type TrustState = '已信任' | '未信任';

type KeyProvider = {
  id: string;
  name: string;
  type: ProviderType;
  endpoint: string;
  port: number;
  connection: ConnectionState;
  trust: TrustState;
  isDefault: boolean;
  resources: number;
  vtpmCount: number;
  updatedAt: string;
  note: string;
};

const initialProviders: KeyProvider[] = [
  {
    id: 'kms-a',
    name: 'kms-prod-a',
    type: 'KMS',
    endpoint: 'kms-a.internal',
    port: 5696,
    connection: '正常',
    trust: '已信任',
    isDefault: true,
    resources: 28,
    vtpmCount: 14,
    updatedAt: '2026-03-09 17:35',
    note: '主生产 KMS，承载当前默认加密流量'
  },
  {
    id: 'kms-b',
    name: 'kms-dr-b',
    type: 'KMS',
    endpoint: 'kms-b.internal',
    port: 5696,
    connection: '异常',
    trust: '未信任',
    isDefault: false,
    resources: 3,
    vtpmCount: 1,
    updatedAt: '2026-03-09 16:10',
    note: '灾备环境预留，证书链待补齐'
  },
  {
    id: 'nkp-local',
    name: 'nkp-local',
    type: 'NKP',
    endpoint: 'system built-in',
    port: 0,
    connection: '正常',
    trust: '已信任',
    isDefault: false,
    resources: 0,
    vtpmCount: 0,
    updatedAt: '2026-03-08 21:00',
    note: '本地原生 Key Provider，高可用待启用'
  }
];

function getStateType(state: ConnectionState) {
  if (state === '正常') {
    return 'running';
  }
  if (state === '连接中') {
    return 'queue';
  }
  return 'error';
}

function formatResources(provider: KeyProvider) {
  return `${provider.resources} 个资源 / ${provider.vtpmCount} 个 vTPM`;
}

export default function App() {
  const [providers, setProviders] = useState<KeyProvider[]>(initialProviders);
  const [activeId, setActiveId] = useState<string>(initialProviders[0].id);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ProviderType>('all');
  const [activeTab, setActiveTab] = useState('provider');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    type: 'KMS' as ProviderType,
    endpoint: '',
    port: '5696',
    note: '',
    makeDefault: false
  });

  const filteredProviders = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    const source = showEmpty ? [] : providers;
    return source.filter((provider) => {
      const matchesType = typeFilter === 'all' || provider.type === typeFilter;
      const matchesKeyword =
        lowerKeyword.length === 0 ||
        provider.name.toLowerCase().includes(lowerKeyword) ||
        provider.endpoint.toLowerCase().includes(lowerKeyword);
      return matchesType && matchesKeyword;
    });
  }, [keyword, providers, showEmpty, typeFilter]);

  const activeProvider =
    filteredProviders.find((provider) => provider.id === activeId) ??
    filteredProviders[0] ??
    null;

  const totalProviders = providers.length;
  const trustedProviders = providers.filter((item) => item.trust === '已信任').length;
  const defaultProvider = providers.find((item) => item.isDefault);
  const riskCount = providers.filter((item) => item.connection === '异常').length;

  function handleCreate() {
    const nextProvider: KeyProvider = {
      id: `provider-${Date.now()}`,
      name: draft.name || `kms-${providers.length + 1}`,
      type: draft.type,
      endpoint: draft.type === 'NKP' ? 'system built-in' : draft.endpoint || 'kms-new.internal',
      port: draft.type === 'NKP' ? 0 : Number(draft.port || '5696'),
      connection: draft.type === 'NKP' ? '正常' : '连接中',
      trust: draft.type === 'NKP' ? '已信任' : '未信任',
      isDefault: draft.makeDefault,
      resources: 0,
      vtpmCount: 0,
      updatedAt: '2026-03-09 18:40',
      note: draft.note || '新建 Key Provider'
    };

    setProviders((current) => {
      const next = current.map((item) =>
        draft.makeDefault ? { ...item, isDefault: false } : item
      );
      return [nextProvider, ...next];
    });
    setActiveId(nextProvider.id);
    setDrawerOpen(false);
    setDraft({
      name: '',
      type: 'KMS',
      endpoint: '',
      port: '5696',
      note: '',
      makeDefault: false
    });
  }

  function handleDelete() {
    if (!activeProvider || activeProvider.resources > 0 || activeProvider.isDefault) {
      setDeleteOpen(false);
      return;
    }
    setProviders((current) => current.filter((item) => item.id !== activeProvider.id));
    setDeleteOpen(false);
  }

  function handleSetDefault(providerId: string) {
    setProviders((current) =>
      current.map((item) => ({ ...item, isDefault: item.id === providerId }))
    );
  }

  return (
      <div className="app-shell">
        <aside className="app-shell__nav">
          <div className="app-shell__brand">
            <div className="app-shell__logo">ZS</div>
            <div>
              <div className="app-shell__title">ZSphere Enyou</div>
              <div className="app-shell__subtitle">F-KMS 演示</div>
            </div>
          </div>
          <div className="nav-group">
            <div className="nav-group__title">资源清单</div>
            <button className="nav-item" type="button">虚拟机</button>
            <button className="nav-item nav-item--active" type="button">Key Provider</button>
          </div>
          <div className="nav-group">
            <div className="nav-group__title">数据保护</div>
            <button className="nav-item" type="button">vTPM</button>
          </div>
          <div className="nav-group">
            <div className="nav-group__title">系统管理</div>
            <button className="nav-item" type="button">KMS 集成</button>
          </div>
        </aside>

        <main className="app-shell__main">
          <HeaderPage
            title="Key Provider"
            description="基于 F-KMS 集成 PRD 组装的真实组件 demo，覆盖列表、详情、创建、空状态和风险删除。"
          >
            <div className="header-actions">
              <Button variant="outline" onClick={() => setShowEmpty((current) => !current)}>
                {showEmpty ? '恢复数据' : '查看空状态'}
              </Button>
              <Button onClick={() => setDrawerOpen(true)}>新增 Key Provider</Button>
            </div>
          </HeaderPage>

          <section className="metric-grid">
            <Card>
              <CardHeader>
                <CardDescription>总 Provider</CardDescription>
                <CardTitle>{totalProviders}</CardTitle>
              </CardHeader>
              <CardContent>默认 Provider: {defaultProvider?.name ?? '-'}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>已信任</CardDescription>
                <CardTitle>{trustedProviders}</CardTitle>
              </CardHeader>
              <CardContent>满足加密接入的可用候选</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>风险项</CardDescription>
                <CardTitle>{riskCount}</CardTitle>
              </CardHeader>
              <CardContent>证书链异常或连接中断的 Provider</CardContent>
            </Card>
          </section>

          <div className="content-grid">
            <section className="panel">
              <div className="panel__toolbar">
                <SearchInput
                  value={keyword}
                  placeholder="搜索名称或地址"
                  onChange={(event) => setKeyword(event.currentTarget.value)}
                />
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as 'all' | ProviderType)}
                  options={[
                    { label: '全部类型', value: 'all' },
                    { label: 'KMS', value: 'KMS' },
                    { label: 'NKP', value: 'NKP' }
                  ]}
                />
              </div>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                tabsList={[
                  { label: 'Provider 列表', value: 'provider' },
                  { label: '接入审计', value: 'audit' }
                ]}
              />

              {activeTab === 'provider' ? (
                filteredProviders.length > 0 ? (
                  <div className="provider-table">
                    <div className="provider-table__header">
                      <span>名称</span>
                      <span>状态</span>
                      <span>信任</span>
                      <span>资源</span>
                      <span>更新时间</span>
                    </div>
                    {filteredProviders.map((provider) => (
                      <button
                        key={provider.id}
                        className={`provider-row${
                          provider.id === activeProvider?.id ? ' provider-row--active' : ''
                        }`}
                        onClick={() => setActiveId(provider.id)}
                        type="button"
                      >
                        <div className="provider-row__name">
                          <span className="provider-row__title">{provider.name}</span>
                          <div className="provider-row__meta">
                            <Tag theme={provider.type === 'KMS' ? 'blue' : 'teal'} size="small">
                              {provider.type}
                            </Tag>
                            {provider.isDefault ? (
                              <Tag theme="green" level="weak" size="small">
                                默认
                              </Tag>
                            ) : null}
                          </div>
                        </div>
                        <State name={provider.connection} type={getStateType(provider.connection)} />
                        <Tag
                          theme={provider.trust === '已信任' ? 'green' : 'yellow'}
                          level="weak"
                          size="small"
                        >
                          {provider.trust}
                        </Tag>
                        <span>{formatResources(provider)}</span>
                        <span>{provider.updatedAt}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="panel__empty">
                    <NoData variant="large">
                      <NoDataCommonLabel>
                        当前没有可展示的 Key Provider，可以从右上角新建或恢复数据。
                      </NoDataCommonLabel>
                    </NoData>
                  </div>
                )
              ) : (
                <div className="audit-list">
                  <Card>
                    <CardHeader>
                      <CardTitle>最近一次证书检查</CardTitle>
                      <CardDescription>2026-03-09 17:20 由系统自动触发</CardDescription>
                    </CardHeader>
                    <CardContent>
                      检测到 `kms-dr-b` 的 KMS 侧证书链不完整，系统已阻止其设为默认 Provider。
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>默认 Provider 变更建议</CardTitle>
                      <CardDescription>删除前需先完成依赖迁移</CardDescription>
                    </CardHeader>
                    <CardContent>
                      文档建议先执行 ReKey 或迁移操作，再移除历史 Key Provider。
                    </CardContent>
                  </Card>
                </div>
              )}
            </section>

            <section className="panel">
              {activeProvider ? (
                <Card className="detail-card">
                  <CardHeader>
                    <div className="detail-card__heading">
                      <div>
                        <CardTitle>{activeProvider.name}</CardTitle>
                        <CardDescription>{activeProvider.note}</CardDescription>
                      </div>
                      <div className="detail-card__actions">
                        {!activeProvider.isDefault ? (
                          <Button
                            variant="outline"
                            onClick={() => handleSetDefault(activeProvider.id)}
                          >
                            设为默认
                          </Button>
                        ) : null}
                        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                          删除
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="detail-card__content">
                    <Field label="Provider 类型">
                      <FieldValue>{activeProvider.type}</FieldValue>
                    </Field>
                    <Field label="连接状态">
                      <State
                        name={activeProvider.connection}
                        type={getStateType(activeProvider.connection)}
                      />
                    </Field>
                    <Field label="信任状态">
                      <Tag
                        theme={activeProvider.trust === '已信任' ? 'green' : 'yellow'}
                        level="weak"
                        size="small"
                      >
                        {activeProvider.trust}
                      </Tag>
                    </Field>
                    <Field label="服务地址">
                      <div className="field-inline">
                        <span>{activeProvider.endpoint}</span>
                        <Copy onClick={() => navigator.clipboard.writeText(activeProvider.endpoint)} />
                      </div>
                    </Field>
                    <Field label="端口">
                      <FieldValue>{activeProvider.port === 0 ? '-' : activeProvider.port}</FieldValue>
                    </Field>
                    <Field label="使用情况">
                      <FieldValue>{formatResources(activeProvider)}</FieldValue>
                    </Field>
                    <Field label="删除约束">
                      <FieldValue>
                        {activeProvider.isDefault
                          ? '默认 Provider 不允许直接删除'
                          : activeProvider.resources > 0
                            ? '存在依赖资源，需先迁移或 ReKey'
                            : '可删除'}
                      </FieldValue>
                    </Field>
                  </CardContent>
                </Card>
              ) : (
                <div className="panel__empty">
                  <NoData variant="large">
                    <NoDataCommonLabel>请先在左侧选择一个 Key Provider。</NoDataCommonLabel>
                  </NoData>
                </div>
              )}
            </section>
          </div>
        </main>

        <Drawer open={drawerOpen} setOpen={setDrawerOpen} placement="right">
          <DrawerHeader>
            <div className="drawer-title">新增 Key Provider</div>
            <div className="drawer-subtitle">支持外部 KMS 与 Native Key Provider 两类对象</div>
          </DrawerHeader>
          <DrawerBody>
            <div className="form-grid">
              <Field label="名称" colon={false}>
                <Input
                  placeholder="请输入名称"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.currentTarget.value }))
                  }
                />
              </Field>
              <Field label="类型" colon={false}>
                <Select
                  value={draft.type}
                  onValueChange={(value) =>
                    setDraft((current) => ({ ...current, type: value as ProviderType }))
                  }
                  options={[
                    { label: '外部 KMS', value: 'KMS' },
                    { label: 'Native Key Provider', value: 'NKP' }
                  ]}
                />
              </Field>
              {draft.type === 'KMS' ? (
                <>
                  <Field label="服务地址" colon={false}>
                    <Input
                      placeholder="kms.example.internal"
                      value={draft.endpoint}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          endpoint: event.currentTarget.value
                        }))
                      }
                    />
                  </Field>
                  <Field label="端口" colon={false}>
                    <Input
                      placeholder="5696"
                      value={draft.port}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, port: event.currentTarget.value }))
                      }
                    />
                  </Field>
                </>
              ) : null}
              <Field label="说明" colon={false}>
                <Textarea
                  rows={4}
                  value={draft.note}
                  placeholder="填写用途、环境或迁移说明"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, note: event.currentTarget.value }))
                  }
                />
              </Field>
              <Field label="创建后设为默认" colon={false}>
                <div className="switch-row">
                  <Switch
                    checked={draft.makeDefault}
                    onCheckedChange={(checked) =>
                      setDraft((current) => ({ ...current, makeDefault: Boolean(checked) }))
                    }
                  />
                  <span>后续新建加密对象将使用该 Provider</span>
                </div>
              </Field>
            </div>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建</Button>
          </DrawerFooter>
        </Drawer>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>删除 Key Provider</DialogTitle>
              <DialogDescription>这是高风险操作，删除后相关资源可能不可用。</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <DialogBanner variant="danger">
                {activeProvider?.isDefault
                  ? '当前对象是默认 Provider，系统禁止直接删除。'
                  : activeProvider && activeProvider.resources > 0
                    ? `当前仍有 ${activeProvider.resources} 个资源依赖该 Provider，请先完成迁移。`
                    : '确认后将永久移除该 Provider。'}
              </DialogBanner>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                取消
              </Button>
              <Button
                variant="danger"
                disabled={Boolean(activeProvider?.isDefault || (activeProvider?.resources ?? 0) > 0)}
                onClick={handleDelete}
              >
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
