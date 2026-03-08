import React, { useState } from 'react';
import { Table, Button, Space, Input, Dropdown, Card, Popconfirm } from 'antd';
import type { MenuProps } from 'antd';
import { PlusOutlined, MoreOutlined, DesktopOutlined, SyncOutlined } from '@ant-design/icons';
import CreateSpecModal from '../components/CreateSpecModal';

const { Search } = Input;

export interface VMSpec {
    key: string;
    name: string;
    os: 'Windows' | 'Linux';
    desc: string;
    networkType: 'Workgroup' | 'Domain' | '-';
    hostname: string;
}

const mockData: VMSpec[] = [
    { key: '1', name: 'Win2019-Common', os: 'Windows', desc: 'Standard Windows Server Temp', networkType: 'Domain', hostname: 'win2019-ds' },
    { key: '2', name: 'Linux-Web-Base', os: 'Linux', desc: 'CentOS 7 Web Base', networkType: '-', hostname: 'web-node' },
    { key: '3', name: 'Test-Win-Workgroup', os: 'Windows', desc: 'Tester Temp', networkType: 'Workgroup', hostname: 'test-pc' },
];

const VMSpecManager: React.FC = () => {
    const [data, setData] = useState<VMSpec[]>(mockData);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingSpec, setEditingSpec] = useState<VMSpec | null>(null);

    const handleDelete = (key: string) => {
        setData(data.filter(item => item.key !== key));
    };

    const showModal = (spec?: VMSpec) => {
        setEditingSpec(spec || null);
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingSpec(null);
    };

    const getActionMenu = (record: VMSpec): MenuProps => ({
        items: [
            { key: 'edit', label: '修改', onClick: () => showModal(record) },
            {
                key: 'delete',
                label: (
                    <Popconfirm title="确定要删除此规范吗？" onConfirm={() => handleDelete(record.key)}>
                        <span style={{ color: '#ff4d4f' }}>删除</span>
                    </Popconfirm>
                ),
            },
        ]
    });

    const columns = [
        {
            title: '规范名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <a style={{ fontWeight: 500 }}>{text}</a>,
        },
        {
            title: '目标操作系统',
            dataIndex: 'os',
            key: 'os',
            render: (os: string) => (
                <Space>
                    <span className={`zsphere-status-dot zsphere-status-${os === 'Windows' ? 'info' : 'running'}`} />
                    {os}
                </Space>
            )
        },
        { title: '简介', dataIndex: 'desc', key: 'desc' },
        { title: '网络参与方式', dataIndex: 'networkType', key: 'networkType' },
        { title: '主机名', dataIndex: 'hostname', key: 'hostname' },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: VMSpec) => (
                <Space size="middle">
                    <Dropdown menu={getActionMenu(record)} trigger={['click']}>
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ marginRight: 16, width: 48, height: 48, background: '#1890ff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DesktopOutlined style={{ color: 'white', fontSize: 24 }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>虚拟机自定义规范</h1>
                    <p style={{ color: 'var(--text-color-secondary)', margin: 0 }}>全局可用，用于配置虚拟机主机名、工作组或域网络等属性。</p>
                </div>
            </div>

            <Card bordered={false} bodyStyle={{ padding: 0 }}>
                <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>新建规范</Button>
                        <Button>批量删除</Button>
                        <Button icon={<SyncOutlined />} />
                    </Space>
                    <Space>
                        <Search placeholder="搜索规范名称" style={{ width: 250 }} />
                    </Space>
                </div>

                <Table
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                    }}
                    columns={columns}
                    dataSource={data}
                    pagination={{ showSizeChanger: true, showQuickJumper: true, showTotal: total => `共 ${total} 条` }}
                />
            </Card>

            <CreateSpecModal
                visible={isModalVisible}
                onClose={handleModalClose}
                initialValues={editingSpec}
            />
        </div>
    );
};

export default VMSpecManager;
