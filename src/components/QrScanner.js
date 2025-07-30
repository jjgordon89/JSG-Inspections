import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import Modal from './Modal';

const QrScanner = ({ onScan, onClose }) => {
  const [data, setData] = useState('No result');

  const handleScan = (result, error) => {
    if (!!result) {
      setData(result?.text);
      onScan(result?.text);
      onClose();
    }

    if (!!error) {
      console.info(error);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="qr-scanner-container">
        <QrReader
          onResult={handleScan}
          constraints={{ facingMode: 'environment' }}
          style={{ width: '100%' }}
        />
        <p>{data}</p>
      </div>
    </Modal>
  );
};

export default QrScanner;