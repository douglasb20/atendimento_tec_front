'use client';
import React, { memo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useService } from 'contexts/ServicesContext';

// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function PDFPreview() {
  const { setPdfPreview, pdfPreview } = useService();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  // eslint-disable-next-line
  const [formValues, setFormValues] = useState({});
  const [mouseUpPdf, setMouseUpPdf] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [widthPDF, setWidthPDF] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }
  const RenderSuccess = () => {
    const annotations = document.querySelectorAll('div[data-annotation-id]');

    // filtrar as anotações para encontrar campos de formulário de texto
    const textFields = Array.from(annotations).filter(
      (annotation) =>
        annotation.getAttribute('data-annotation-type') === 'Widget' &&
        annotation.getAttribute('data-field-type') === 'Tx',
    );

    // preencher valores iniciais de formulário
    const newFormValues = {};
    textFields.forEach((textField) => {
      const fieldName = textField.getAttribute('data-field-name');
      newFormValues[fieldName] = textField.getAttribute('data-annotation-value');
    });
    setFormValues(newFormValues);
  };

  React.useEffect(() => {
    const body = document.body;
    body.classList.remove('overflow-hidden');
    if (pdfPreview.visible) {
      body.classList.add('overflow-hidden');
      setNumPages(0);
      const pdfViewContent = document.querySelector('#pdfViewContent');

      pdfViewContent.addEventListener('mouseover', function () {
        setHidden(false);
        setMouseUpPdf(true);
      });
      pdfViewContent.addEventListener('mouseout', function () {
        setMouseUpPdf(false);
      });

      const pdfControlPages: HTMLElement = document.querySelector(
        '#pdfControlPages',
      ) as HTMLElement;

      pdfControlPages.addEventListener('animationend', (e) => {
        if ((e.target as HTMLElement).classList.contains('animate__fadeOut')) {
          setHidden(true);
        }
      });
    }
    setPageNumber(1);

    let vWidth = window.innerWidth / 2 > 500 ? window.innerWidth / 2 : 500;
    const viewWidth = () => {
      vWidth = window.innerWidth / 2 > 500 ? window.innerWidth / 2 : 500;
      setWidthPDF(vWidth);
    };
    setWidthPDF(vWidth);
    window.onresize = () => viewWidth();

    return () => (window.onresize = null);

    //eslint-disable-next-line
  }, [pdfPreview.visible]);

  React.useEffect(() => {
    const thresholdNumber = 0.3;

    let observer = new IntersectionObserver(
      (entries) => {
        // Loop das entradas observáveis
        entries.forEach((entry) => {
          const { target } = entry;
          // Se o elemento estiver 30% ou mais visível
          if (entry.intersectionRatio >= thresholdNumber) {
            const pageId = target.getAttribute('id');
            setPageNumber(+pageId.replace('page_', ''));
          }
        });
      },
      {
        threshold: [thresholdNumber],
      },
    );

    document.querySelectorAll('.pagesView').forEach((page) => {
      observer.observe(page);
    });

    setTimeout(() => setPageNumber(1), 50);

    return () => (observer = null);
  }, [numPages]);

  const onFirstPage = () => {
    let targetSection = document.getElementById('page_' + 1);

    setTimeout(() => targetSection.scrollIntoView({ behavior: 'smooth' }), 50);

    // setPageNumber( 1)
  };

  const onNextPage = () => {
    let targetSection = document.getElementById('page_' + (pageNumber + 1));

    setTimeout(() => targetSection.scrollIntoView({ behavior: 'smooth' }), 50);

    setPageNumber(pageNumber + 1);
  };

  const onPrevPage = () => {
    let targetSection = document.getElementById('page_' + (pageNumber - 1));

    setTimeout(() => targetSection.scrollIntoView({ behavior: 'smooth' }), 50);

    setPageNumber(pageNumber - 1);
  };

  const onLastPage = () => {
    let targetSection = document.getElementById('page_' + numPages);

    setTimeout(() => targetSection.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    pdfPreview.visible && (
      <div
        className="p-5 p-component-overlay overflow-auto flex justify-content-center "
        style={{ zIndex: 4500 }}
      >
        <button
          type="button"
          className="p-button p-2 right-0 mr-5 p-button-rounded fixed p-button-text border-circle"
          style={{ top: 5 }}
          onClick={() => setPdfPreview({ visible: false, file: null })}
        >
          <span className="pi pi-times text-3xl text-white"></span>
        </button>
        <div
          id="pdfViewContent"
          className="relative flex justify-content-center h-min w-min mt-4"
        >
          <Document
            loading={'Carregando documento'}
            file={pdfPreview.file}
            onLoadSuccess={onDocumentLoadSuccess}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div
                className="my-3 pagesView"
                id={`page_${index + 1}`}
                key={`page_${index + 1}`}
              >
                <Page
                  // renderAnnotationLayer={true}
                  // renderInteractiveForms={true}
                  pageNumber={index + 1}
                  renderTextLayer={false}
                  width={widthPDF}
                  renderMode="canvas"
                  onRenderSuccess={RenderSuccess}
                />
              </div>
            ))}
          </Document>

          <div
            id="pdfControlPages"
            className={`animate__animated ${mouseUpPdf ? 'animate__fadeIn' : 'animate__fadeOut'} ${
              hidden ? 'hidden' : 'flex'
            } animate__faster fixed border-round surface-100 shadow-3 p-2 top-0 gap-2 align-items-center mt-2`}
          >
            {numPages > 1 && (
              <>
                <button
                  className={`p-button ${pageNumber <= 1 ? 'p-disabled' : ''}`}
                  onClick={onFirstPage}
                  disabled={pageNumber <= 1}
                >
                  <i className="pi pi-fw pi-angle-double-left"></i>
                </button>
                <button
                  className={`p-button ${pageNumber <= 1 ? 'p-disabled' : ''}`}
                  onClick={onPrevPage}
                  disabled={pageNumber <= 1}
                >
                  <i className="pi pi-fw pi-chevron-left"></i>
                </button>
              </>
            )}
            <span className="text-xl mx-2">
              Página {pageNumber} de {numPages}
            </span>
            {numPages > 1 && (
              <>
                <button
                  className={`p-button ${pageNumber >= numPages ? 'p-disabled' : ''}`}
                  onClick={onNextPage}
                  disabled={pageNumber >= numPages}
                >
                  <i className="pi pi-fw pi-chevron-right"></i>
                </button>
                <button
                  className={`p-button ${pageNumber >= numPages ? 'p-disabled' : ''}`}
                  onClick={onLastPage}
                  disabled={pageNumber >= numPages}
                >
                  <i className="pi pi-fw pi-angle-double-right"></i>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  );
}

export default memo(PDFPreview);
