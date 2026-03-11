import React, { useState } from 'react';
import { Modal, Form, Input, Button, Tabs, message, Select } from 'antd';
import { Lock, Mail, User, Shield } from 'lucide-react';

interface AuthModalProps {
    open: boolean;
    onSuccess: (user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleSubmit = async (values: any) => {
        setLoading(true);
        const endpoint = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';
        const maxRetries = 2;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(values),
                    credentials: 'include',
                    signal: AbortSignal.timeout(25000),
                });

                const data = await res.json();
                if (res.ok) {
                    if (data.user?.status === 'pending') {
                        message.warning('Account created! Awaiting Admin Approval.', 5);
                    } else if (data.user?.status === 'suspended') {
                        message.error('Your account is suspended.');
                        setLoading(false);
                        return;
                    } else {
                        message.success(`Successfully ${activeTab === 'login' ? 'logged in' : 'registered'}`);
                    }
                    onSuccess(data.user);
                    setLoading(false);
                    return;
                } else {
                    // Server returned an error response — don't retry (it's not a network issue)
                    message.error(data.error || 'Authentication failed');
                    setLoading(false);
                    return;
                }
            } catch (err: any) {
                console.error('Authentication fetch error:', err);
                const isLastAttempt = attempt === maxRetries;
                if (isLastAttempt) {
                    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
                        message.error('Server is not responding. Please check if the backend is running.');
                    } else {
                        message.error('Network error. Please check your connection and try again.');
                    }
                } else {
                    // Wait before retrying (exponential backoff)
                    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
                }
            }
        }
        setLoading(false);
    };

    return (
        <Modal
            open={open}
            footer={null}
            closable={false}
            maskClosable={false}
            centered
            className="glass-modal"
            width={400}
        >
            <div className="text-center mb-6 pt-4">
                <h2 className="text-2xl font-black font-['Outfit'] text-white uppercase tracking-wider m-0">
                    SolarFetch
                </h2>
                <p className="text-[10px] text-muted uppercase tracking-widest mt-1">
                    Zero-Trust Authentication
                </p>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                centered
                className="mb-4"
                items={[
                    { key: 'login', label: 'Link Node' },
                    { key: 'register', label: 'New Node' }
                ]}
            />

            <Form form={form} onFinish={handleSubmit} layout="vertical">
                {activeTab === 'register' && (
                    <>
                        <Form.Item name="username" rules={[{ required: true, message: 'Node alias required' }]}>
                            <Input prefix={<User size={16} className="text-muted" />} placeholder="Node Alias (Username)" className="glass-input" size="large" />
                        </Form.Item>
                        <Form.Item name="role" rules={[{ required: true, message: 'Select your node role' }]} initialValue="consumer">
                            <Select size="large" className="glass-select" placeholder="Select Role" suffixIcon={<Shield size={16} className="text-muted" />}>
                                <Select.Option value="prosumer">Prosumer (Sell Energy)</Select.Option>
                                <Select.Option value="consumer">Consumer (Buy Energy)</Select.Option>
                            </Select>
                        </Form.Item>
                    </>
                )}
                <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
                    <Input prefix={<Mail size={16} className="text-muted" />} placeholder="Secure Email" className="glass-input" size="large" />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Password > 6 chars' }]}>
                    <Input.Password prefix={<Lock size={16} className="text-muted" />} placeholder="Encryption Key (Password)" className="glass-input" size="large" />
                </Form.Item>

                <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full h-12 mt-4 bg-[#00e5ff] hover:bg-[#00ff88] text-black font-black uppercase tracking-widest border-none transition-colors"
                    loading={loading}
                >
                    {activeTab === 'login' ? 'Initialize Interface' : 'Register Identity'}
                </Button>
            </Form>
        </Modal>
    );
};

export default AuthModal;
