import { Fragment } from 'react';

import HeaderSection from './HeaderSection';

const DashboardPage = async () => {
  return (
    <Fragment>
      <div className="grid gap-2 justify-content-center">
        <div
          className="col-12"
          style={{ maxWidth: 1400 }}
        >
          {/* <HeaderSection /> */}
        </div>
      </div>
    </Fragment>
  );
};

export default DashboardPage;
