import $ from '../libs/jquery';
import Utils from '../utils/utils';
import Toast from '../utils/toast';
import app from '../app';
import Vote from '../models/vote';
import { VoteType, VoteInterface } from 'community-js/lib/faces';

export default class PageVotes {
  private votes: Vote[] = [];
  private firstCall: boolean = true;

  constructor() {}

  async open() {
    $('.link-votes').addClass('active');
    $('.page-votes').show();
    this.syncPageState();
    this.events();
  }

  async close() {
    for(let i = 0, j = this.votes.length; i < j; i++) {
      this.votes[i].hide();
    }
    this.votes = [];

    await this.removeEvents();
    $('.link-votes').removeClass('active');
    $('.page-votes').hide();
  }

  public async syncPageState() {
    const state = await app.getCommunity().getState();

    $('.min-lock-length').text(state.settings.get('lockMinLength'));
    $('.max-lock-length').text(state.settings.get('lockMaxLength'));

    if(this.firstCall) {
      this.extraParams();
      this.firstCall = false;
    }

    $('.proposals').html('');
    if(state.votes.length) {
      this.votes = [];
      $('.proposals').html('');
      for(let i = 0, j = state.votes.length; i < j; i++) {
        const vote = new Vote(state.votes[i], i);
        this.votes.push(vote);
        await vote.show();
      }
    } else {
      const html = `
      <div class="col-12">
        <div class="card">
          <div class="card-body text-center">
            This Community doesn't have any votes.
          </div>
        </div>
      </div>
      `;
      $('.proposals').html(html);
    }

    $('[data-toggle="tooltip"]').tooltip();
    $('.dimmer').removeClass('active');
  }

  private async extraParams() {
    // Check for hashes to see if we need to open the votes modal.
    const hashes = app.getHashes();
    if(hashes.length > 2 && hashes[2] === 'mint') {
      const addy = hashes[3];
      const qty = hashes[4];
      const lockLength = hashes[5];

      if(addy) {
        $('#vote-recipient').val(addy.trim());
      }
      if(qty) {
        $('#vote-qty').val(qty.trim());
      }
      if(lockLength) {
        $('#vote-lock').val(lockLength.trim());
      }

      $('#modal-new-vote').modal('show');
    }
  }

  private async setValidate() {
    const state = await app.getCommunity().getState();

    const recipient = $('#vote-recipient').val().toString().trim();
    const setKey = $('#vote-set-key').val();
    const setCustom = $('#vote-set-custom').val(); 
    let setValue: string | number = $('#vote-set-value').val().toString().trim();
    
    if(setKey === 'quorum' || setKey === 'support') {
      setValue = +setValue;
      if(isNaN(setValue) || setValue < 1 || setValue > 99 || !Number.isInteger(setValue)) {
        $('#vote-set-value').addClass('is-invalid');
        return false;
      } else {
        $('#vote-set-value').removeClass('is-invalid');
      }
    } else if(setKey === 'lockMinLength' || setKey === 'lockMaxLength') {
      setValue = +setValue;
      if(isNaN(setValue) || setValue < 1 || !Number.isInteger(setValue)) {
        if(setKey === 'lockMinLength') {
          $('.lock-set-value-invalid').text('Minimum lock length cannot be greater nor equal to the maximum lock length.');
          $('#vote-set-value').addClass('is-invalid');
        } else if(setKey === 'lockMaxLength') {
          $('.lock-set-value-invalid').text('Maximum lock length cannot be lower nor equal to the minimum lock length.');
          $('#vote-set-value').addClass('is-invalid');
        }
        return false;
      }
      
      if(setKey === 'lockMinLength' && setValue > state.settings.get('lockMaxLength')) {
        $('.lock-set-value-invalid').text('Minimum lock length cannot be greater nor equal to the maximum lock length.');
        $('#vote-set-value').addClass('is-invalid');
        return false;
      } else if(setKey === 'lockMaxLength' && setValue < state.settings.get('lockMinLength')) {
        $('.lock-set-value-invalid').text('Maximum lock length cannot be lower nor equal to the minimum lock length.');
        $('#vote-set-value').addClass('is-invalid');
        return false;
      }
    } else if(setKey === 'role') {
      if(!Utils.isArTx(recipient)) {
        $('#vote-recipient').addClass('is-invalid');
        return false;
      }
      if(!setValue.length) {
        $('.lock-set-value-invalid').text('Need to type a role.');
        $('#vote-set-value').addClass('is-invalid');
        return false;
      }
    } else if (setKey === 'custom') {
      console.log('validating custom');
      
      if (setCustom === 'appURL' || setCustom === 'discussionLinks' || setCustom === 'socialMedia') {
        if(!Utils.isURL(setValue)) {
          $('#vote-set-value').addClass('is-invalid');
          return false; 
        }
      } else if(setCustom === 'communityDesc') {

      } else if(setCustom === 'logo') {

      } else if(setCustom === 'customEntry') {

      }

    } 
    else {
      return false;
    }

    $('#vote-set-value').removeClass('is-invalid');
    return true;
  }

  async validateVotes() {
    $('input[name="voteType"]').on('change', e => {
      const voteType = $('input[name="voteType"]:checked').val();

      switch (voteType) {
        case 'mint':
          $('.vote-recipient, .vote-qty, .vote-lock-length').show();
          $('.vote-fields').hide();
          break;
        case 'burnVault':
          $('.vote-recipient, .vote-qty, .vote-lock-length, .vote-fields').hide();
          $('.vote-burn-vault').show();
          break;
        case 'set':
          $('.vote-recipient, .vote-qty, .vote-lock-length, .vote-fields').hide();
          $('.vote-set').show();
          $('#vote-set-key').trigger('change');
          break;
        case 'indicative':
          $('.vote-recipient, .vote-qty, .vote-lock-length, .vote-fields').hide();
          break;
      }
    }).trigger('change');

    $('#vote-set-key').on('change', e => {
      const setKey = $(e.target).val();
      const $target = $('#vote-set-value').val('');

      $('.vote-recipient').hide();
      $('.vote-set-custom').hide();
      switch(setKey) {
        case 'role':
          $('.vote-recipient').show();
          $target.removeClass('input-number percent');
          break;
        case 'lockMinLength':
        case 'lockMaxLength':
          $target.addClass('input-number').removeClass('percent');
          break 
        case 'quorum':
        case 'support':
          $target.addClass('input-number percent');
          break;
        case 'custom':
          $('.vote-set-custom').show();
          $target.removeClass('input-number percent');
          break; 
      }
    });
    $('#vote-set-custom').on('change', e => {
      const setCustom = $(e.target).val();
      console.log(setCustom);
      $('#vote-set-value').val('');

      $('.vote-recipient').hide();
      switch(setCustom) {
        case 'appURL':
        case 'communityDesc':
        case 'logo':
        case 'discussionLinks':
        case 'socialMedia':
      }
    });

    $('#vote-recipient, #vote-target').on('input', async e => {
      const $target = $(e.target);
      const value = $target.val().toString().trim();
      if(!await Utils.isArTx(value)) {
        $target.addClass('is-invalid');
      } else {
        $target.removeClass('is-invalid');
      }
    });

    $('.btn-max-lock').on('click', async e => {
      e.preventDefault();

      const state = await app.getCommunity().getState();
      $('.input-max-lock').val(state.settings.get('lockMaxLength'));
    });

    $('#vote-set-value').on('input', async e => {
      await this.setValidate();
    });

    $('#vote-qty').on('input', async e => {
      const qty = +$('#vote-qty').val().toString().trim();

      if(qty < 1 || !Number.isInteger(qty)) {
        $('#vote-qty').addClass('is-invalid');
      } else {
        $('#vote-qty').removeClass('is-invalid');
      }
    });

    $('#vote-lock-length').on('input', async e => {
      const length = +$('#vote-lock-length').val().toString().trim();
      const state = await app.getCommunity().getState();

      if(isNaN(length) ||
         !Number.isInteger(length) ||
         (length < state.settings.get('lockMinLength') || length > state.settings.get('lockMaxLength')) && length != 0) {
        $('#vote-lock-length').addClass('is-invalid');
      } else {
        $('#vote-lock-length').removeClass('is-invalid');
      }
    });

    $('#vote-target').on('input', async e => {
      const target = $('#vote-target').val().toString().trim();
      if(!await Utils.isArTx(target)) {
        $('#vote-target').addClass('is-invalid');
      } else {
        $('#vote-target').removeClass('is-invalid');
      }
    });

    $('#vote-note').on('input', e => {
      const note = $('#vote-note').val().toString().trim();
      if(!note.length) {
        $('#vote-note').addClass('is-invalid');
      } else {
        $('#vote-note').removeClass('is-invalid');
      }
    });

    $('.do-vote').on('click', async e => {
      e.preventDefault();
      const state = await app.getCommunity().getState();

      // @ts-ignore
      const voteType: VoteType = $('input[name="voteType"]:checked').val().toString();
      const recipient = $('#vote-recipient').val().toString().trim();
      const qty = +$('#vote-qty').val().toString().trim();
      const length = +$('#vote-lock-length').val().toString().trim();
      const target = $('#vote-target').val().toString().trim();
      const setKey = $('#vote-set-key').val();
      const setCustom = $('#vote-set-custom').val(); 

      let setValue = $('#vote-set-value').val().toString().trim();
      const note = $('#vote-note').val().toString().trim();

      let voteParams: VoteInterface = {
        type: voteType
      };

      if(voteType === 'mint') {
        if(!await Utils.isArTx(recipient)) {
          $('#vote-recipient').addClass('is-invalid');
          return;
        }
        if(qty < 1 || !Number.isInteger(qty)) {
          $('#vote-qty').addClass('is-invalid');
          return;
        }

        voteParams['recipient'] = recipient;
        voteParams['qty'] = qty;

        // If a lock length was specified, mint locked tokens.
        if(length > 0) {
          if(isNaN(length) || !Number.isInteger(length) || length < state.settings.get('lockMinLength') || length > state.settings.get('lockMaxLength')) {
            $('#vote-lock-length').addClass('is-invalid');
            return;
          }
          voteParams['type'] = 'mintLocked';
          voteParams['lockLength'] = length;
        }
      } else if(voteType === 'burnVault') {
        if(!await Utils.isArTx(target)) {
          $('#vote-target').addClass('is-invalid');
          return;
        }
        voteParams['target'] = target;
      } else if(voteType === 'set') {
        if(!await this.setValidate()) {
          return;
        }
        console.log(setKey);

        // want to set the key to custom value (App url, community desc, etc)
        if (setKey === 'custom') {
          // @ts-ignore
          voteParams['key'] = setCustom;
        }
        else {
          // @ts-ignore
          voteParams['key'] = setKey;
        }
        voteParams['value'] = setValue;
      }
      
      console.log('Voteparams: ', voteParams['key']);

      if(!note.length) {
        $('#vote-note').addClass('is-invalid');
        return;
      }
      voteParams['note'] = note;

      // All validations passed
      $(e.target).addClass('btn-loading disabled');
      try {
        const txid = await app.getCommunity().proposeVote(voteParams);
        app.getStatusify().add('Create vote', txid)
        .then(async () => {
          // Just create the new vote, do not sync the entire page.
          const state = await app.getCommunity().getState(false);

          const voteId = state.votes.length - 1;
          if(this.votes.length < state.votes.length) {
            const vote = new Vote(state.votes[this.votes.length], this.votes.length);
            this.votes.push(vote);
            await vote.show();
          }
        });
      } catch (err) {
        console.log(err.message);
        const toast = new Toast();
        toast.show('Vote error', err.message, 'error', 3000);
      }

      $('#modal-new-vote').modal('hide');
      $(e.target).removeClass('btn-loading disabled');
    });
  }
  async removeValidateVotes() {
    $('input[name="voteType"], #vote-set-key').off('change');
    $('#vote-recipient, #vote-target, #vote-set-value').off('input');
    $('.btn-max-lock, .do-vote').off('click');
  }

  private async events() {
    await this.validateVotes();
  }
  private async removeEvents() {
   await this.removeValidateVotes();
  }
}