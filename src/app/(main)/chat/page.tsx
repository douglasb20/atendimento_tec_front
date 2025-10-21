import { Fragment } from 'react';
import ChatSection from './ChatSection';

export default async function DashboardPage() {

  return (
    <Fragment>
      <div className="grid">
        <div className="col-12 card flex flex-column justify-content-center shadow-1">
          <ChatSection />
        </div>
      </div>
    </Fragment>
  );
};

