using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Data.Entity;

namespace TheCommunicatorLibrary
{
///<summary>
   public class Contact
    {
        public static Dictionary<Guid, Contact> Contacts = new Dictionary<Guid, Contact>();

        public Guid Id { get; set; }

        public string NickName { private get; set; }

        public string Name { get;  private set; }

        public string Surname { get; set; }

        public string Email { get; set; }

        public string Password { private get; set; }
        
        public ContactState State { get; set; }

        public Contact()
        {
            this.NickName = string.Empty;
            this.Name = string.Empty;
            this.Surname = string.Empty;
            this.Email = string.Empty;
            this.Password = string.Empty;
            this.Id = Guid.NewGuid();
            this.State = ContactState.Online;
        }

        public Contact(string nickName, string name, string surname, string email, string password)
        {
            this.Id = Guid.NewGuid();
            this.NickName = nickName;
            this.Name = name;
            this.Surname = surname;
            this.Email = email;
            this.Password = password;
            this.State = ContactState.Online;
        }

        public void ChangeState(ContactState newState) =>
            this.State = newState;

        public override string ToString()
        {
            return this.Surname + " " + this.Name + this.State.ToString();
        }

        public enum ContactState
        {
            Online, Offline
        }
       /// </summary>
    }
}
