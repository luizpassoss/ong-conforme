import { Component, ViewChild } from "@angular/core";
import { DoacaoModel } from "../../../core/models/doacao.model";
import { HistoricoModel } from "./historico.model";
import { setTime } from "ngx-bootstrap/chronos/utils/date-setters";
import { Observable, filter } from "rxjs";
import { UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { BsModalRef, BsModalService, ModalDirective } from "ngx-bootstrap/modal";
import { DatePipe } from "@angular/common";
import { DatabaseService } from "src/app/core/services/database/database.service";
import { BsLocaleService } from "ngx-bootstrap/datepicker";
import { DateService } from "src/app/core/services/date/date-service.service";
import { ToastrService } from "ngx-toastr";
import Swal from "sweetalert2";
import { defineLocale, ptBrLocale } from "ngx-bootstrap/chronos";

@Component({
  selector: "app-historico",
  templateUrl: "./historico.component.html",
  styleUrls: ["./historico.component.scss"],
})
export class HistoricoComponent {

  modalRef?: BsModalRef;
  masterSelected!: boolean;

  historicoForm!: UntypedFormGroup;
  submitted = false;

  // Table data
  content?: any;
  historicos?: HistoricoModel[] = [];
  ordersList!: Observable<DoacaoModel[]>;
  total: Observable<number>;

  isInput: boolean = true;
  addInitialMov: boolean = false;
  selectedCategoria: string = "";

  itemMovs: Object = {};

  isLoadingList: boolean = true;
  today: Date = new Date();

  @ViewChild("showModal", { static: false }) showModal?: ModalDirective;
  @ViewChild("editItemModal", { static: false }) editItemModal?: ModalDirective;
  @ViewChild("removeItemModal", { static: false }) removeItemModal?: ModalDirective;
  @ViewChild("movimentacaoModal", { static: false })   movimentacaoModal?: ModalDirective;

  disableSubmitBtn: boolean = false;

  txtSearch: string;
  filteredCategoria: string = "";
  bsRangeFilterValue: string = "";

  selectedHistorico: Number;
  deletId: any;
  editedId: any;
  editedCategoria: string = "";
  filterSelectedRangeDate: Date[];

  currentPage = 1;
  itemsPerPage = 10;
  doacoes: any[];
  constructor(
    private modalService: BsModalService,
    private formBuilder: UntypedFormBuilder,
    private datePipe: DatePipe,
    private _databaseService: DatabaseService,
    private localeService: BsLocaleService,
    private _dateService: DateService,
    private _toastService: ToastrService
  ) {
    this.historicoForm = this.formBuilder.group({
      id: [""],
      data: ["", [Validators.required]],
      qntd: [Number, [Validators.required]],
      tipoMov: ["", [Validators.required]],
      doadorName: ["", [Validators.required]],
    });

    defineLocale("pt-br", ptBrLocale);
    this.localeService.use("pt-br");
  }

  ngOnInit() {
    this.updateListHistorico();
  }

  onFilterDateChange(dates: Date[]) {
    this.filterSelectedRangeDate = dates;

    if (dates === null) return;

    if (dates.length === 2) {
      const startDate = dates[0];
      const endDate = dates[1];

      const startDay = ("0" + startDate.getDate()).slice(-2);
      const startMonth = ("0" + (startDate.getMonth() + 1)).slice(-2);
      const startYear = startDate.getFullYear();
      const formattedStartDate = `${startDay}/${startMonth}/${startYear}`;

      const endDay = ("0" + endDate.getDate()).slice(-2);
      const endMonth = ("0" + (endDate.getMonth() + 1)).slice(-2);
      const endYear = endDate.getFullYear();
      const formattedEndDate = `${endDay}/${endMonth}/${endYear}`;


      this.bsRangeFilterValue = `${formattedStartDate} - ${formattedEndDate}`;
    } else {
      console.error("O intervalo de datas não contém duas datas.");
    }
  }

  pageChanged($event: any) {
    this.currentPage = $event;
  }

  updateListHistorico() {
    this.isLoadingList = true;
    
    this.doacoes = [];
    this._databaseService.getDoacao().subscribe({
      next: (values) => {
        if (values) {
          this.doacoes = values;
        }
      },
      error: (err) => {
        console.log(err);
      },
    });

    this.historicos = [];
    this._databaseService.getHistorico().subscribe({
      next: (values) => {
        if (values) {
          values.forEach((value) => {
            const date = new Date(value.data);
            const day = date.getDate().toString().padStart(2, "0");
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const year = date.getFullYear();

            value.data = `${day}/${month}/${year}`;

            value.itemName = this.doacoes.find(e => e.id === value.doacao_id)?.itemName;
          });

          this.historicos = values.reverse();
          this.isLoadingList = false;
        }
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  checkUncheckAll(ev: any) {
    if (this.historicos.length > 0)
      this.historicos.forEach((historico: HistoricoModel) => {
        historico.marked = ev.target.checked;
      });
  }
  checkedValGet: any[] = [];


  confirmDelete(id: any) {
    this.deletId = id;
    this.alertConfirmOrCancel();
  }

  deleteOrder() {
    if (this.deletId === null) {
      this.showToast("Erro ao deletar item");

      return;
    }

    this._databaseService
      .deleteSingleHistorico(this.deletId)
      .then(() => {
        this.deletId = null;

        this.alertConfirmDelete();

        this.updateListHistorico();
      })
      .catch(() => {
        console.error("Erro ao deletar historico de id: " + this.deletId);
      });
  }

  /**
   * Open modal
   * @param content modal content
   */
  openModal(content: any) {
    this.submitted = false;
    this.modalRef = this.modalService.show(content, { class: "modal-md" });
  }



  toggleInput(value: string) {
    if (value === "entrada") this.isInput = true;
    else this.isInput = false;
  }

  toggleCheckbox($event: any) {
    this.addInitialMov = $event;
  }

  removeAccents(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  showToast(text: string) {
    var message = text;

    this._toastService.show(message, "", {
      timeOut: 5000, // ms
      closeButton: false,
      progressBar: true,
      tapToDismiss: true,
      positionClass: "toast-bottom-right",
      toastClass: "opacity-100 bg-dark ngx-toastr",
    });
  }

  closeToast() {
    this._toastService.clear();
  }

  alertSucess(msg1, msg2: string) {
    Swal.fire(msg1, msg2, "success");
  }

  alertConfirmDelete() {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-primary",
        cancelButton: "btn btn-danger ms-2",
      },
      buttonsStyling: false,
      iconHtml:
        '<i class="fas fa-trash-alt text-danger animate__animated animate__shakeX fs-1"></i>',
    });

    swalWithBootstrapButtons.fire(
      "Deletado!",
      "Doação foi deletada com sucesso.",
      "error"
    );
  }

  alertConfirmOrCancel() {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        cancelButton: "btn btn-danger ms-2",
        confirmButton: "btn btn-success",
      },
      buttonsStyling: false,
    });

    swalWithBootstrapButtons
      .fire({
        title: "Tem certeza?",
        text: "Essa ação é irreversível!",
        icon: "question",
        cancelButtonText: "Cancelar!",
        confirmButtonText: "Deletar!",
        showCancelButton: true,
      })
      .then((result) => {
        if (result.value) {
          this.deleteOrder();
        } else if (
          /* Read more about handling dismissals below */
          result.dismiss === Swal.DismissReason.cancel
        ) {
          swalWithBootstrapButtons.fire(
            "Cancelado",
            "Seu histórico não foi deletado!",
            "error"
          );
        }
      });
  }
  
}
