import React, { useState } from 'react';
import { Layout, Menu, Input, Modal, Dropdown, Space, Avatar, Badge, Breadcrumb } from 'antd';
import {
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    UserOutlined,
    AppstoreOutlined,
    ContainerOutlined,
    DesktopOutlined,
    PlaySquareOutlined,
    BellOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import VMSpecManager from '../pages/VMSpecManager';
import CreateVMFromTemplate from '../pages/CreateVMFromTemplate';

const { Header, Sider, Content, Footer } = Layout;
const { Search } = Input;

const AppLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { key: '/', icon: <AppstoreOutlined />, label: '首页' },
        {
            key: 'sub1',
            icon: <ContainerOutlined />,
            label: '资源清单',
            children: [
                { key: '/vm-spec', label: '虚拟机自定义规范', icon: <DesktopOutlined /> },
                { key: '/create-vm', label: '从模版新建虚拟机', icon: <PlaySquareOutlined /> }
            ],
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header className="system-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="logo" style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginRight: '40px' }}>
                        ZStack ZSphere
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="全局搜索 (Ctrl+K)"
                        style={{ width: 200, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}
                    />
                    <Badge count={5} size="small">
                        <BellOutlined style={{ fontSize: '18px', color: 'white' }} />
                    </Badge>
                    <Dropdown menu={{ items: [{ key: '1', label: '退出登录' }] }} placement="bottomRight">
                        <Space style={{ color: 'white', cursor: 'pointer' }}>
                            <Avatar icon={<UserOutlined />} size="small" />
                            admin
                        </Space>
                    </Dropdown>
                </div>
            </Header>
            <Layout>
                <Sider trigger={null} collapsible collapsed={collapsed} width={220} theme="light">
                    <Menu
                        theme="light"
                        mode="inline"
                        defaultSelectedKeys={['/vm-spec']}
                        defaultOpenKeys={['sub1']}
                        selectedKeys={[location.pathname]}
                        items={menuItems}
                        onClick={({ key }) => {
                            navigate(key);
                        }}
                    />
                </Sider>
                <Layout className="site-layout">
                    <Content
                        style={{
                            padding: '24px',
                            minHeight: 280,
                        }}
                    >
                        <Routes>
                            <Route path="/" element={<div style={{ background: '#fff', padding: 24, minHeight: 360, borderRadius: 4 }}>欢迎回到 ZSphere Dashboard</div>} />
                            <Route path="/vm-spec" element={<VMSpecManager />} />
                            <Route path="/create-vm" element={<CreateVMFromTemplate />} />
                        </Routes>
                    </Content>

                    <Footer style={{
                        padding: '8px 24px',
                        background: '#fff',
                        borderTop: '1px solid #d9d9d9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Space size="middle">
                            <div>任务 <Badge count={2} size="small" style={{ backgroundColor: '#1890ff' }} /></div>
                            <div>报警 <Badge count={1} size="small" /></div>
                        </Space>
                        <span style={{ color: '#bfbfbf' }}>v4.x Demo UI</span>
                    </Footer>
                </Layout>
            </Layout>
        </Layout>
    );
};

export default AppLayout;
