import {
  Box,
  Button,
  Flex,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuGroup,
  MenuItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Space,
  Text,
  Textarea,
  TextLabel,
} from '@trendmicro/react-styled-ui';
import { useService } from '@xstate/react';
import chainedFunction from 'chained-function';
import { ensureArray } from 'ensure-type';
import _uniqueId from 'lodash/uniqueId';
import React, { useContext, useRef } from 'react';
import { Form, Field } from 'react-final-form';
import axios from 'app/api/axios';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import FormGroup from 'app/components/FormGroup';
import InlineError from 'app/components/InlineError';
import useModal from 'app/components/Modal/useModal';
import i18n from 'app/lib/i18n';
import { composeValidators, required } from 'app/widgets/shared/validations';
import { ServiceContext } from '../context';
import variables from '../shared/variables';

const updateMacro = async (id, { name, content }) => {
  try {
    const url = `/api/macros/${id}`;
    const data = {
      name,
      content,
    };
    await axios.put(url, data);
  } catch (err) {
    // Ignore error
  }
};

const deleteMacro = async (id) => {
  try {
    const url = `/api/macros/${id}`;
    await axios.delete(url);
  } catch (err) {
    // Ignore error
  }
};

const mapMacroVariablesToMenuGroupItems = (variables) => ensureArray(variables).map(x => {
  if (x.role === 'group') {
    return (
      <MenuGroup key={_uniqueId()} role="group" title={x.title}>
        {mapMacroVariablesToMenuGroupItems(x.children)}
      </MenuGroup>
    );
  }

  if (x.role === 'menuitem') {
    return (
      <MenuItem key={_uniqueId()} role="menuitem" px="6x">
        {x.value}
      </MenuItem>
    );
  }

  return null;
});

const ConfirmDeleteMacro = ({
  onClose,
  name,
  onConfirm,
}) => (
  <Modal
    closeOnEsc
    closeOnOutsideClick
    isCloseButtonVisible
    isOpen
    onClose={onClose}
    size="sm"
  >
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>
        {i18n._('Delete Macro')}
      </ModalHeader>
      <ModalBody>
        <Box mb="4x">
          {i18n._('Are you sure you want to delete this macro?')}
        </Box>
        <Text fontWeight="semibold">
          {name}
        </Text>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="default"
          onClick={onClose}
        >
          {i18n._('Cancel')}
        </Button>
        <Button
          variant="emphasis"
          onClick={onConfirm}
        >
          {i18n._('Delete')}
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
);

const EditMacro = ({
  onClose,
  id,
  name,
  content,
}) => {
  const { openModal } = useModal();
  const { fetchMacrosService } = useContext(ServiceContext);
  const [, send] = useService(fetchMacrosService);
  const contentRef = useRef();
  const initialValues = {
    name,
    content,
  };
  const handleClickDelete = (e) => {
    const onParentClose = onClose;

    openModal(({ onClose }) => (
      <ConfirmDeleteMacro
        onClose={onClose}
        name={name}
        onConfirm={chainedFunction(
          onClose,
          onParentClose,
          async () => {
            await deleteMacro(id);
            send('FETCH');
          },
        )}
      />
    ));
  };

  return (
    <Modal
      isCloseButtonVisible
      isOpen
      onClose={onClose}
      size="md"
    >
      <Form
        initialValues={initialValues}
        onSubmit={async (values) => {
          const { name, content } = values;
          await updateMacro(id, { name, content });
          send('FETCH');
          onClose();
        }}
        subscription={{}}
      >
        {({ form }) => (
          <>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                {i18n._('Edit Macro')}
              </ModalHeader>
              <ModalBody>
                <Field
                  name="name"
                  validate={composeValidators(required)}
                >
                  {({ input, meta }) => {
                    return (
                      <FormGroup>
                        <TextLabel mb="2x">
                          {i18n._('Macro Name')}
                        </TextLabel>
                        <Box>
                          <Input {...input} />
                        </Box>
                        {(meta.error && meta.touched) && (
                          <InlineError>{meta.error}</InlineError>
                        )}
                      </FormGroup>
                    );
                  }}
                </Field>
                <Field
                  name="content"
                  validate={composeValidators(required)}
                >
                  {({ input, meta }) => {
                    return (
                      <FormGroup>
                        <Flex align="center" justify="space-between">
                          <Box>
                            <TextLabel mb="2x">
                              {i18n._('Macro Commands')}
                            </TextLabel>
                          </Box>
                          <Box>
                            <Menu>
                              <MenuButton variant="ghost">
                                <FontAwesomeIcon icon="plus" fixedWidth />
                                <Space width={8} />
                                {i18n._('Macro Variables')}
                              </MenuButton>
                              <MenuList
                                onClick={(event) => {
                                  if (event.target.getAttribute('role') !== 'menuitem') {
                                    return;
                                  }

                                  const textarea = contentRef.current;
                                  if (!textarea) {
                                    return;
                                  }

                                  const textToInsert = event.target.innerHTML;
                                  const caretPos = textarea.selectionStart;
                                  const front = (textarea.value).substring(0, caretPos);
                                  const back = (textarea.value).substring(textarea.selectionEnd, textarea.value.length);
                                  const value = front + textToInsert + back;
                                  input.onChange(value);
                                }}
                                maxHeight={180}
                                overflowY="auto"
                              >
                                {mapMacroVariablesToMenuGroupItems(variables)}
                              </MenuList>
                            </Menu>
                          </Box>
                        </Flex>
                        <Textarea
                          {...input}
                          ref={contentRef}
                          rows={8}
                        />
                        {(meta.error && meta.touched) && (
                          <InlineError>{meta.error}</InlineError>
                        )}
                      </FormGroup>
                    );
                  }}
                </Field>
              </ModalBody>
              <ModalFooter justify="space-between">
                <Box>
                  <Button
                    variant="emphasis"
                    minWidth="20x"
                    onClick={handleClickDelete}
                  >
                    {i18n._('Delete')}
                  </Button>
                </Box>
                <Box>
                  <Button
                    variant="default"
                    onClick={onClose}
                    minWidth="20x"
                  >
                    {i18n._('Cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => form.submit()}
                    minWidth="20x"
                  >
                    {i18n._('Save Changes')}
                  </Button>
                </Box>
              </ModalFooter>
            </ModalContent>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default EditMacro;
