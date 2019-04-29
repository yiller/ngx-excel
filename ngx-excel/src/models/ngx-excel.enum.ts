export const enum NgxExcelColumnType {
    Text                = 'text',
    TextNumber          = 'textNumber',
    MultilineText       = 'multilineText',
    Number              = 'number',
    Currency            = 'currency',
    DateTime            = 'datetime',
    Date                = 'date',
    Time                = 'time',
    Bool                = 'bool',
    Array               = 'array',
    Url                 = 'url',
    SelectOption        = 'selectOption',
    MultiSelectOption   = 'multiSelectOption',
    TagsSelectOption    = 'tagsSelectOption',
    PrimaryKey          = 'primaryKey',
    ForeignKey          = 'foreignKey',
    MultiForeignKey     = 'multiForeignKey',
    UploadFile          = 'uploadFile',
    MultiUploadFile     = 'multiUploadFile',
    Tree                = 'tree'
}

export const enum NgxExcelCellMode {
    ReadMode            = 'readMode',
    EditMode            = 'editMode'
}
