import React from 'react';
import BoxLoginSection from './BoxLogin';
import MolduraAuth from '../_components/MolduraAuth';

function Login() {
  return (
    <MolduraAuth>
      <BoxLoginSection />
    </MolduraAuth>
  );
}

Login.getLayout = function getLayout(page) {
  return <React.Fragment>{page}</React.Fragment>;
};

export default Login;
