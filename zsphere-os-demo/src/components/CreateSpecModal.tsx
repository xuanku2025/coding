import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Radio, Switch, Alert, Select, Checkbox, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { VMSpec } from '../types';

interface CreateSpecModalProps {
    visible: boolean;
    onClose: () => void;
    initialValues: VMSpec | null;
}

const CreateSpecModal: React.FC<CreateSpecModalProps> = ({ visible, onClose, initialValues }) => {
    const [form] = Form.useForm();
    const [osType, setOsType] = useState<'Windows' | 'Linux'>('Windows');
    const [networkType, setNetworkType] = useState<'Workgroup' | 'Domain'>('Workgroup');
    const [hostnameType, setHostnameType] = useState<'Auto' | 'Manual'>('Manual');

    const isEdit = !!initialValues;

    useEffect(() => {
        if (visible) {
            if (initialValues) {
                setOsType(initialValues.os);
                setNetworkType(initialValues.networkType === 'Domain' ? 'Domain' : 'Workgroup');
                form.setFieldsValue(initialValues);
                if (isEdit) {
                    form.setFieldsValue({ _adjustSpec: true });
                }
            } else {
                setOsType('Windows');
                setNetworkType('Workgroup');
                setHostnameType('Manual');
                form.resetFields();
                form.setFieldsValue({ os: 'Windows', networkType: 'Workgroup', hostnameType: 'Manual', generateSid: true });
            }
        }
    }, [visible, initialValues, form]);

    const handleOk = () => {
        form.validateFields().then(values => {
            console.log('Form Values:', values);
            onClose();
        }).catch(info => {
            console.log('Validate Failed:', info);
        });
    };

    return (
        <Modal
            title={isEdit ? "修改自定义规范" : "新建自定义规范"}
            open={visible}
            onOk={handleOk}
            onCancel={onClose}
            width={600}
            okText="确定"
            cancelText="取消"
            destroyOnClose
        >
            <Form
                form={form}
                layout="horizontal"
                labelCol={{ span: 5 }}
                wrapperCol={{ span: 18 }}
                initialValues={{ os: 'Windows', networkType: 'Workgroup', hostnameType: 'Manual', generateSid: true }}
            >
                {isEdit && (
                    <Form.Item name="_adjustSpec" valuePropName="checked" wrapperCol={{ offset: 5, span: 18 }}>
                        <Checkbox>调整虚拟机规范</Checkbox>
                    </Form.Item>
                )}

                <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入规范名称' }]}>
                    <Input placeholder="输入虚拟机规范名称" />
                </Form.Item>
                <Form.Item label="简介" name="desc">
                    <Input.TextArea placeholder="简短描述" />
                </Form.Item>

                <Form.Item label="目标操作系统" name="os">
                    <Radio.Group onChange={e => setOsType(e.target.value)} disabled={isEdit}>
                        <Radio.Button value="Windows">Windows (默认)</Radio.Button>
                        <Radio.Button value="Linux">Linux</Radio.Button>
                    </Radio.Group>
                </Form.Item>

                <div style={{ background: '#fafafa', padding: '16px', borderRadius: 4, marginTop: 16 }}>
                    {osType === 'Windows' && (
                        <>
                            <Form.Item label="网络方式" name="networkType">
                                <Radio.Group onChange={e => setNetworkType(e.target.value)}>
                                    <Radio value="Workgroup">工作组</Radio>
                                    <Radio value="Domain">域</Radio>
                                </Radio.Group>
                            </Form.Item>

                            {networkType === 'Workgroup' && (
                                <Form.Item label="工作组名称" name="workgroupName" rules={[{ required: true, message: '工作组名称必填' }]}>
                                    <Input placeholder="输入工作组名称" />
                                </Form.Item>
                            )}

                            {networkType === 'Domain' && (
                                <>
                                    <Form.Item label="域名" name="domainName" rules={[{ required: true, message: '域名必填' }]}>
                                        <Input placeholder="输入完整域名, 如 corp.example.com" />
                                    </Form.Item>
                                    <Form.Item label="域用户名" name="domainUser" rules={[{ required: true, message: '域用户名必填' }]}>
                                        <Input placeholder="有加域权限的用户名" />
                                    </Form.Item>
                                    <Form.Item label="域密码" name="domainPwd">
                                        <Input.Password placeholder="选填，若需密码加域则填写" />
                                    </Form.Item>
                                    <Form.Item label={
                                        <span>
                                            组织单位&nbsp;
                                            <Tooltip title="示例: OU=Computers,DC=corp,DC=example,DC=com"><InfoCircleOutlined style={{ color: '#bfbfbf' }} /></Tooltip>
                                        </span>
                                    } name="domainOU">
                                        <Input placeholder="选填，留空则默认" />
                                    </Form.Item>
                                </>
                            )}

                            <Form.Item label="主机名方式" name="hostnameType">
                                <Radio.Group onChange={(e) => setHostnameType(e.target.value)}>
                                    <Radio value="Auto">使用虚拟机名称</Radio>
                                    <Radio value="Manual">手动指定</Radio>
                                </Radio.Group>
                            </Form.Item>

                            {hostnameType === 'Manual' && (
                                <Form.Item label="主机名" name="hostname">
                                    <Input placeholder="输入主机名称" />
                                </Form.Item>
                            )}

                            <Form.Item label="生成新SID" name="generateSid" valuePropName="checked">
                                <Switch checkedChildren="强制启用" unCheckedChildren="关闭" disabled />
                                <span style={{ color: '#8c8c8c', marginLeft: 8 }}>Windows强制启用(不可关闭)</span>
                            </Form.Item>
                        </>
                    )}

                    {osType === 'Linux' && (
                        <>
                            <Alert
                                message="主机名如果是中文会不生效"
                                type="warning"
                                showIcon
                                style={{ marginBottom: 16, background: 'transparent', border: 'none', padding: 0 }}
                            />
                            <Form.Item label="主机名方式" name="hostnameType">
                                <Radio.Group onChange={(e) => setHostnameType(e.target.value)}>
                                    <Radio value="Auto">使用虚拟机名称</Radio>
                                    <Radio value="Manual">手动指定</Radio>
                                </Radio.Group>
                            </Form.Item>
                            {hostnameType === 'Manual' && (
                                <Form.Item label="主机名" name="hostname">
                                    <Input placeholder="输入主机名称" />
                                </Form.Item>
                            )}
                            <Form.Item label="管理员密码" name="adminPwd">
                                <Input.Password placeholder="设置 root 密码" />
                            </Form.Item>
                        </>
                    )}
                </div>
            </Form>
        </Modal>
    );
};

export default CreateSpecModal;
