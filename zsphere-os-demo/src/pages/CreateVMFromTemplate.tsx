import React, { useState } from 'react';
import { Card, Form, Input, Radio, Switch, Alert, Button, Steps, Divider, Tooltip } from 'antd';
import { InfoCircleOutlined, DesktopOutlined } from '@ant-design/icons';
import CreateSpecModal from '../components/CreateSpecModal';

const { Step } = Steps;

const mockSpecList = [
    { label: 'Win2019-Common', value: '1' },
    { label: 'Linux-Web-Base', value: '2' },
    { label: 'Test-Win-Workgroup', value: '3' },
];

const CreateVMFromTemplate: React.FC = () => {
    const [form] = Form.useForm();
    const [specMethod, setSpecMethod] = useState<'None' | 'Existing' | 'Manual'>('None');
    const [isVmToolsInstalled, setIsVmToolsInstalled] = useState(true);
    const [isSpecModalVisible, setIsSpecModalVisible] = useState(false);

    // OS is mocked as Linux to demonstrate the warning message requirement
    const mockTemplateOS = 'Linux';

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ marginRight: 16, width: 48, height: 48, background: '#1890ff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DesktopOutlined style={{ color: 'white', fontSize: 24 }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>从模版新建虚拟机</h1>
                    <p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>配置基础信息、计算资源、网络、存储及操作系统属性。</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ width: 200 }}>
                    <Steps direction="vertical" current={2} size="small">
                        <Step title="基础信息" />
                        <Step title="计算与网络" />
                        <Step title="操作系统属性" />
                        <Step title="高级设置" />
                    </Steps>
                </div>

                <div style={{ flex: 1 }}>
                    <Card title="操作系统属性" bordered={false} bodyStyle={{ padding: '24px 32px' }}>
                        <div style={{ marginBottom: 24 }}>
                            <Switch
                                checked={isVmToolsInstalled}
                                onChange={setIsVmToolsInstalled}
                                checkedChildren="运行中"
                                unCheckedChildren="未安装"
                            />
                            <span style={{ marginLeft: 8, color: '#8c8c8c' }}>
                                模拟 VMTools 状态 (未安装时会禁用规范选择)
                            </span>
                        </div>

                        {mockTemplateOS === 'Linux' && (
                            <Alert
                                message="主机名如果是中文会不生效"
                                type="warning"
                                showIcon
                                style={{ marginBottom: 24 }}
                            />
                        )}

                        <Form form={form} layout="vertical" initialValues={{ specMethod: 'None' }}>
                            <Form.Item label="规范配置方式" name="specMethod">
                                <Radio.Group onChange={(e) => setSpecMethod(e.target.value)}>
                                    <Radio.Button value="None">不使用新规范</Radio.Button>
                                    <Tooltip title={!isVmToolsInstalled ? "请先安装 VMtools 并确保其处于运行状态" : ""}>
                                        <Radio.Button value="Existing" disabled={!isVmToolsInstalled}>使用已有规范</Radio.Button>
                                    </Tooltip>
                                    <Tooltip title={!isVmToolsInstalled ? "请先安装 VMtools 并确保其处于运行状态" : ""}>
                                        <Radio.Button value="Manual" disabled={!isVmToolsInstalled}>手动配置规范</Radio.Button>
                                    </Tooltip>
                                </Radio.Group>
                            </Form.Item>

                            {specMethod === 'Existing' && isVmToolsInstalled && (
                                <div style={{ background: '#fafafa', padding: 24, borderRadius: 4 }}>
                                    <Alert
                                        message="提示：使用自定义规范配置后，虚拟内部可能需要重启才能完全生效。"
                                        type="info"
                                        showIcon
                                        style={{ marginBottom: 16 }}
                                    />
                                    <Form.Item label="选择规范" name="selectedSpec" rules={[{ required: true, message: '请选择一个规范' }]}>
                                        <Radio.Group>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {mockSpecList.map(spec => (
                                                    <li key={spec.value} style={{ marginBottom: 12 }}>
                                                        <Radio value={spec.value}>{spec.label}</Radio>
                                                        <Button type="link" size="small" onClick={() => setIsSpecModalVisible(true)}>修改</Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </Radio.Group>
                                    </Form.Item>
                                    <Button type="dashed" icon={<DesktopOutlined />} onClick={() => setIsSpecModalVisible(true)}>
                                        添加规范
                                    </Button>
                                </div>
                            )}

                            {specMethod === 'Manual' && isVmToolsInstalled && (
                                <div style={{ background: '#fafafa', padding: 24, borderRadius: 4 }}>
                                    <Alert message="手动配置仅在本次新建生效，不保存为全局规范。" type="info" showIcon style={{ marginBottom: 24 }} />

                                    <Form.Item label="主机名方式" name="hostnameType" initialValue="Auto">
                                        <Radio.Group>
                                            <Radio value="Auto">使用虚拟机名称</Radio>
                                            <Radio value="Manual">手动指定</Radio>
                                        </Radio.Group>
                                    </Form.Item>
                                    <Form.Item label="管理员密码" name="adminPwd">
                                        <Input.Password placeholder="设置 root 密码" style={{ width: 300 }} />
                                    </Form.Item>
                                </div>
                            )}

                            <Divider />

                            <Form.Item>
                                <Button type="primary" style={{ marginRight: 8 }}>上一步</Button>
                                <Button type="primary">下一步</Button>
                                <Button type="text" style={{ marginLeft: 8 }}>取消</Button>
                            </Form.Item>

                        </Form>
                    </Card>
                </div>
            </div>

            <CreateSpecModal
                visible={isSpecModalVisible}
                onClose={() => setIsSpecModalVisible(false)}
                initialValues={null}
            />
        </div>
    );
};

export default CreateVMFromTemplate;
