import React, { useRef, forwardRef } from 'react';

// interface ChangeEvent<T = EventTarget> {
//     target?: T;
//     lenght?: number;
// }

interface ICunstomInputFile {
  label: string;
  onChange?: (e: React.ChangeEvent) => void;
  accepts?: string;
  id: string;
  name: string;
  onClick?: (e: MouseEvent) => void;
  buttonClassname?: string;
  value?: File | string;
}

// eslint-disable-next-line
const CustomInputFile = forwardRef((props: ICunstomInputFile, ref) => {
  const divRef = useRef(null);

  const customChange = props.onChange;

  const changeButtonProp = () => {
    getInputFile().click();
  };

  const getInputFile = (): HTMLInputElement => {
    let id = props.id.includes('.') ? props.id.replaceAll('.', '\\.') : props.id;
    const inputFile: HTMLInputElement = divRef?.current.querySelector('#' + id) as HTMLInputElement;

    return inputFile;
  };

  const changeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const buttonFile: HTMLElement = divRef?.current.querySelector('#textButton');
    const files: FileList = e.target.files;

    if (files.length === 0) {
      buttonFile.innerText = props?.label;
    } else {
      let labelButton = e.target.files[0].name;
      buttonFile.innerText =
        labelButton.length > 25 ? labelButton.slice(0, 25) + '... ' : labelButton;
    }

    if (customChange) {
      customChange(e);
    }
  };

  React.useEffect(() => {
    const { value } = props;
    const buttonFile: HTMLElement = divRef?.current.querySelector('#textButton');

    if (!value) {
      buttonFile.innerText = props?.label;
      getInputFile().value = null;
    } else {
      if (typeof value === 'string') {
        let labelButton = value.split('/').slice(-1)[0];
        buttonFile.innerText =
          labelButton.length > 25 ? labelButton.slice(0, 25) + '... ' : labelButton;
      }
    }
    //eslint-disable-next-line
  }, [props.value]);

  return (
    <div
      ref={divRef}
      className={'campoUpload'}
    >
      <div className="flex flex-row align-items-center justify-content-between">
        <div
          onClick={changeButtonProp}
          id="buttonFile"
          className={'p-button flex gap-2 w-auto ' + props.buttonClassname}
        >
          <span className="pi pi-upload"></span>
          <span
            id="textButton"
            className=""
          >
            {props?.label}
          </span>
        </div>
      </div>

      <input
        name={props.name}
        id={props.id}
        className="hidden"
        type="file"
        onChange={(e) => changeFile(e)}
        accept={props.accepts}
      />
    </div>
  );
});

CustomInputFile.displayName = 'CustomInputFile';

export default CustomInputFile;
