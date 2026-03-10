import React from 'react';
import { Row, Col } from 'antd';

interface DashboardGridProps {
    topLeft: React.ReactNode;
    topRight: React.ReactNode;
    bottomLeft: React.ReactNode;
    bottomRight: React.ReactNode;
}

const DashboardGrid: React.FC<DashboardGridProps> = ({ topLeft, topRight, bottomLeft, bottomRight }) => {
    return (
        <div className="flex flex-col gap-6">
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={14}>
                    <div className="h-[450px]">
                        {topLeft}
                    </div>
                </Col>
                <Col xs={24} lg={10}>
                    <div className="h-[450px]">
                        {topRight}
                    </div>
                </Col>
            </Row>
            <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                    <div className="h-[400px]">
                        {bottomLeft}
                    </div>
                </Col>
                <Col xs={24} md={12}>
                    <div className="h-[400px]">
                        {bottomRight}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardGrid;
